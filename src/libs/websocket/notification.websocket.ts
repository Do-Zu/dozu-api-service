import { Socket } from 'socket.io';
import logger from '@/utils/logger';
import { WebSocketService } from './socket.io';
import { redisInstance } from '@/libs/redis/default/redisDefault';

/**
 * Notification WebSocket Service
 * Handles user registration and notification delivery via WebSocket
 * Uses Redis to store socket mappings for multi-instance support
 */
export class NotificationWebSocketService extends WebSocketService {
  private static notificationInstance: NotificationWebSocketService;
  
  // Local socket storage: socketId -> Socket object (cannot serialize to Redis)
  private socketStorage: Map<string, Socket> = new Map();
  
  // Redis keys
  private readonly REDIS_USER_SOCKETS_KEY = 'websocket:user:sockets'; // userId -> Set of socketIds
  private readonly REDIS_SOCKET_USER_KEY = 'websocket:socket:user'; // socketId -> userId
  private readonly REDIS_TTL = 86400; // 24 hours TTL for socket mappings

  private constructor() {
    super();
  }

  public static getInstance(): NotificationWebSocketService {
    if (!NotificationWebSocketService.notificationInstance) {
      NotificationWebSocketService.notificationInstance = new NotificationWebSocketService();
    }
    return NotificationWebSocketService.notificationInstance;
  }

  public initialize(httpServer: any): void {
    // Get io instance from parent (or initialize if not done)
    const io = this.getIO();
    if (!io) {
      // If parent hasn't initialized, initialize it first
      super.initialize(httpServer);
    }
    
    // Setup notification-specific listeners on existing connections
    this.setupNotificationListeners();
  }

  private setupNotificationListeners(): void {
    const io = this.getIO();
    if (!io) {
      logger.warn('Cannot setup notification listeners: IO instance not available');
      return;
    }

    // Listen to existing connections and new connections
    io.sockets.sockets.forEach((socket) => {
      this.setupSocketListeners(socket);
    });

    // Listen for new connections
    io.on('connection', (socket: Socket) => {
      this.setupSocketListeners(socket);
    });
  }

  private setupSocketListeners(socket: Socket): void {
    // Store socket in local storage
    this.socketStorage.set(socket.id, socket);

    // Register user for notifications
    socket.on('register-user', async (userId: string) => {
      await this.registerUser(socket, userId);
    });

    // Note: Disconnect is handled by parent class which calls onSocketDisconnect hook
  }

  /**
   * Register a user's socket for notifications
   */
  private async registerUser(socket: Socket, userId: string): Promise<void> {
    if (!userId) {
      logger.warn(`Received empty userId from socket ${socket.id}`);
      return;
    }

    try {
      const socketId = socket.id;
      
      // Store socket in local storage
      this.socketStorage.set(socketId, socket);

      // Store in Redis: socketId -> userId
      await redisInstance.set(
        `${this.REDIS_SOCKET_USER_KEY}:${socketId}`,
        userId,
        this.REDIS_TTL
      );

      // Add socketId to user's socket set in Redis
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      const existingSockets = await redisInstance.get(userSocketsKey);
      
      let socketIds: string[] = [];
      if (existingSockets) {
        try {
          socketIds = JSON.parse(existingSockets);
        } catch (e) {
          logger.warn(`Failed to parse socket IDs for user ${userId}, resetting`);
          socketIds = [];
        }
      }

      if (!socketIds.includes(socketId)) {
        socketIds.push(socketId);
        await redisInstance.set(
          userSocketsKey,
          JSON.stringify(socketIds),
          this.REDIS_TTL
        );
      }

      const socketCount = socketIds.length;
      logger.info(
        `User ${userId} registered for notifications on socket ${socketId} (Total sockets: ${socketCount})`
      );

      // Confirm registration to client
      socket.emit('user-registered', { userId, socketId });
    } catch (error) {
      logger.error(`Failed to register user ${userId} for socket ${socket.id}:`, error);
    }
  }

  /**
   * Handle socket disconnect - called by parent class
   */
  protected onSocketDisconnect(socket: Socket): void {
    // Call async handler but don't wait for it
    this.handleDisconnect(socket).catch(error => {
      logger.error(`Error in handleDisconnect for socket ${socket.id}:`, error);
    });
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const socketId = socket.id;
      
      // Get userId from Redis
      const userId = await redisInstance.get(`${this.REDIS_SOCKET_USER_KEY}:${socketId}`);
      
      if (userId) {
        // Remove socketId from user's socket set in Redis
        const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
        const existingSockets = await redisInstance.get(userSocketsKey);
        
        if (existingSockets) {
          try {
            let socketIds: string[] = JSON.parse(existingSockets);
            socketIds = socketIds.filter(id => id !== socketId);
            
            if (socketIds.length > 0) {
              await redisInstance.set(
                userSocketsKey,
                JSON.stringify(socketIds),
                this.REDIS_TTL
              );
            } else {
              // Remove the key if no sockets left
              await redisInstance.del(userSocketsKey);
            }
          } catch (e) {
            logger.warn(`Failed to update socket list for user ${userId}`);
          }
        }

        // Remove socketId -> userId mapping
        await redisInstance.del(`${this.REDIS_SOCKET_USER_KEY}:${socketId}`);
        
        logger.info(`User ${userId} disconnected from socket ${socketId}`);
      }

      // Remove from local storage
      this.socketStorage.delete(socketId);
    } catch (error) {
      logger.error(`Failed to handle disconnect for socket ${socket.id}:`, error);
    }
  }

  /**
   * Send notification to a specific user
   */
  public async sendToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Get user's socket IDs from Redis
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      const socketIdsJson = await redisInstance.get(userSocketsKey);

      if (!socketIdsJson) {
        logger.debug(`No sockets found for user ${userId} in Redis`);
        return false;
      }

      let socketIds: string[] = [];
      try {
        socketIds = JSON.parse(socketIdsJson);
      } catch (e) {
        logger.warn(`Failed to parse socket IDs for user ${userId}`);
        return false;
      }

      if (socketIds.length === 0) {
        logger.debug(`No active sockets found for user ${userId}`);
        return false;
      }

      // Send to all active sockets
      let sent = false;
      const validSocketIds: string[] = [];

      for (const socketId of socketIds) {
        const socket = this.socketStorage.get(socketId);
        
        if (socket && socket.connected) {
          socket.emit(event, data);
          sent = true;
          validSocketIds.push(socketId);
        } else {
          // Clean up invalid socket ID from Redis
          logger.debug(`Removing invalid socket ${socketId} for user ${userId}`);
          await this.cleanupInvalidSocket(userId, socketId);
        }
      }

      // Update Redis with only valid socket IDs
      if (validSocketIds.length > 0 && validSocketIds.length !== socketIds.length) {
        await redisInstance.set(
          userSocketsKey,
          JSON.stringify(validSocketIds),
          this.REDIS_TTL
        );
      } else if (validSocketIds.length === 0) {
        // Remove key if no valid sockets
        await redisInstance.del(userSocketsKey);
      }

      if (sent) {
        logger.info(
          `Sent ${event} to user ${userId} on ${validSocketIds.length} socket(s)`
        );
      }

      return sent;
    } catch (error) {
      logger.error(`Failed to send ${event} to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Clean up invalid socket from Redis
   */
  private async cleanupInvalidSocket(userId: string, socketId: string): Promise<void> {
    try {
      // Remove socketId -> userId mapping
      await redisInstance.del(`${this.REDIS_SOCKET_USER_KEY}:${socketId}`);
      
      // Remove from user's socket set
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      const existingSockets = await redisInstance.get(userSocketsKey);
      
      if (existingSockets) {
        try {
          let socketIds: string[] = JSON.parse(existingSockets);
          socketIds = socketIds.filter(id => id !== socketId);
          
          if (socketIds.length > 0) {
            await redisInstance.set(
              userSocketsKey,
              JSON.stringify(socketIds),
              this.REDIS_TTL
            );
          } else {
            await redisInstance.del(userSocketsKey);
          }
        } catch (e) {
          logger.warn(`Failed to cleanup socket ${socketId} for user ${userId}`);
        }
      }
    } catch (error) {
      logger.error(`Error cleaning up invalid socket ${socketId}:`, error);
    }
  }

  /**
   * Get count of active sockets for a user
   */
  public async getUserSocketCount(userId: string): Promise<number> {
    try {
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      const socketIdsJson = await redisInstance.get(userSocketsKey);

      if (!socketIdsJson) {
        return 0;
      }

      const socketIds: string[] = JSON.parse(socketIdsJson);
      
      // Count only connected sockets
      let count = 0;
      for (const socketId of socketIds) {
        const socket = this.socketStorage.get(socketId);
        if (socket && socket.connected) {
          count++;
        }
      }

      return count;
    } catch (error) {
      logger.error(`Failed to get socket count for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check if user is online
   */
  public async isUserOnline(userId: string): Promise<boolean> {
    const count = await this.getUserSocketCount(userId);
    return count > 0;
  }

  /**
   * Get all socket IDs for a user (for debugging)
   */
  public async getUserSocketIds(userId: string): Promise<string[]> {
    try {
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      const socketIdsJson = await redisInstance.get(userSocketsKey);

      if (!socketIdsJson) {
        return [];
      }

      return JSON.parse(socketIdsJson);
    } catch (error) {
      logger.error(`Failed to get socket IDs for user ${userId}:`, error);
      return [];
    }
  }
}

export const notificationWebSocketService = NotificationWebSocketService.getInstance();

