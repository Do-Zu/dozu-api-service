import { Socket } from 'socket.io';
import logger from '@/utils/logger';
import { WebSocketService, webSocketService } from './socket.io';
import { redisInstance } from '@/libs/redis/default/redisDefault';
import { Server as HttpServer } from 'http';

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

  public initialize(httpServer: HttpServer): void {
    // Reuse the base WebSocketService's io instance if it's already initialized
    // This prevents creating multiple Socket.IO servers on the same HTTP server
    const baseIO = webSocketService.getIO();
    
    if (baseIO) {
      // Base service is already initialized, reuse its io instance
      this.setIO(baseIO);
    } else {
      // Base service not initialized yet, initialize it first
      // This should not happen if initialization order is correct, but handle it gracefully
      webSocketService.initialize(httpServer);
      const io = webSocketService.getIO();
      if (io) {
        this.setIO(io);
      } else {
        logger.error('Failed to initialize base WebSocketService');
        return;
      }
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

      // Add socketId to user's socket set in Redis (atomic operation)
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      await redisInstance.sadd(userSocketsKey, socketId);
      await redisInstance.expire(userSocketsKey, this.REDIS_TTL);
      
      // Get current socket count
      const socketIds = await redisInstance.smembers(userSocketsKey);
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
        // Remove socketId from user's socket set in Redis (atomic operation)
        const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
        const removedCount = await redisInstance.srem(userSocketsKey, socketId);
        
        // Check if set is empty and remove key if so
        const remainingSockets = await redisInstance.smembers(userSocketsKey);
        if (remainingSockets.length === 0) {
          await redisInstance.del(userSocketsKey);
        }

        // Remove socketId -> userId mapping
        await redisInstance.del(`${this.REDIS_SOCKET_USER_KEY}:${socketId}`);
        
        if (removedCount > 0) {
          logger.info(`User ${userId} disconnected from socket ${socketId}`);
        }
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
      // Get user's socket IDs from Redis (atomic read)
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      const socketIds = await redisInstance.smembers(userSocketsKey);

      if (socketIds.length === 0) {
        logger.debug(`No active sockets found for user ${userId}`);
        return false;
      }

      // Send to all active sockets
      let sent = false;
      const invalidSocketIds: string[] = [];

      for (const socketId of socketIds) {
        const socket = this.socketStorage.get(socketId);
        
        if (socket && socket.connected) {
          socket.emit(event, data);
          sent = true;
        } else {
          // Mark invalid socket ID for cleanup
          invalidSocketIds.push(socketId);
          logger.debug(`Removing invalid socket ${socketId} for user ${userId}`);
        }
      }

      // Clean up invalid socket IDs (atomic remove)
      if (invalidSocketIds.length > 0) {
        await redisInstance.srem(userSocketsKey, ...invalidSocketIds);
        
        // Check if set is empty and remove key if so
        const remainingSockets = await redisInstance.smembers(userSocketsKey);
        if (remainingSockets.length === 0) {
          await redisInstance.del(userSocketsKey);
        }
      }

      if (sent) {
        const validSocketCount = socketIds.length - invalidSocketIds.length;
        logger.info(
          `Sent ${event} to user ${userId} on ${validSocketCount} socket(s)`
        );
      }

      return sent;
    } catch (error) {
      logger.error(`Failed to send ${event} to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Clean up invalid socket from Redis (atomic operation)
   */
  private async cleanupInvalidSocket(userId: string, socketId: string): Promise<void> {
    try {
      // Remove socketId -> userId mapping
      await redisInstance.del(`${this.REDIS_SOCKET_USER_KEY}:${socketId}`);
      
      // Remove from user's socket set (atomic operation)
      const userSocketsKey = `${this.REDIS_USER_SOCKETS_KEY}:${userId}`;
      await redisInstance.srem(userSocketsKey, socketId);
      
      // Check if set is empty and remove key if so
      const remainingSockets = await redisInstance.smembers(userSocketsKey);
      if (remainingSockets.length === 0) {
        await redisInstance.del(userSocketsKey);
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
      const socketIds = await redisInstance.smembers(userSocketsKey);

      if (socketIds.length === 0) {
        return 0;
      }
      
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
      return await redisInstance.smembers(userSocketsKey);
    } catch (error) {
      logger.error(`Failed to get socket IDs for user ${userId}:`, error);
      return [];
    }
  }
}

export const notificationWebSocketService = NotificationWebSocketService.getInstance();

