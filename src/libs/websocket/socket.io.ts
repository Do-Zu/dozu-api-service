import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger';

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server | null = null;
  private activeSockets: Map<string, Socket> = new Map(); // jobId -> socket
  private userSockets: Map<string, Set<Socket>> = new Map(); // userId -> set of sockets

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(httpServer: HttpServer): void {
    if (this.io) return;

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || ['*'];
    
    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow all origins if '*' is specified, or check against allowed list
          if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            logger.warn(`WebSocket CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupListeners();
    logger.info('WebSocket server initialized');
  }

  private setupListeners(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id} from origin: ${socket.handshake.headers.origin}`);
      
      // Log connection details for debugging
      logger.debug(`Socket handshake:`, {
        id: socket.id,
        transport: socket.conn.transport.name,
        remoteAddress: socket.handshake.address,
        headers: socket.handshake.headers,
      });

      // Register the client with a specific generation job ID
      socket.on('register', (jobId: string) => {
        this.activeSockets.set(jobId, socket);
        logger.info(`Client ${socket.id} registered for job ${jobId}`);
      });

      // Register user for notifications
      socket.on('register-user', (userId: string) => {
        if (!userId) {
          logger.warn(`Received empty userId from socket ${socket.id}`);
          return;
        }
        
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket);
        
        const socketCount = this.userSockets.get(userId)!.size;
        logger.info(`User ${userId} registered for notifications on socket ${socket.id} (Total sockets for user: ${socketCount})`);
        
        // Confirm registration to client
        socket.emit('user-registered', { userId, socketId: socket.id });
      });

      socket.on('disconnect', () => {
        // Remove socket from active connections
        for (const [jobId, activeSocket] of this.activeSockets.entries()) {
          if (activeSocket.id === socket.id) {
            this.activeSockets.delete(jobId);
            logger.info(`Client ${socket.id} unregistered from job ${jobId}`);
          }
        }

        // Remove socket from user connections
        for (const [userId, sockets] of this.userSockets.entries()) {
          if (sockets.has(socket)) {
            sockets.delete(socket);
            if (sockets.size === 0) {
              this.userSockets.delete(userId);
            }
            logger.info(`User ${userId} disconnected from socket ${socket.id}`);
          }
        }
        
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public sendResult(jobId: string, data: Record<string, unknown>): boolean {
    const socket = this.activeSockets.get(jobId);
    if (!socket) {
      logger.warn(`No client registered for job ${jobId}`);
      return false;
    }

    socket.emit('result', data);
    logger.info(`Sent result to client for job ${jobId}`);

    // Optionally close the connection
    socket.disconnect(true);
    this.activeSockets.delete(jobId);

    return true;
  }

  public sendToUser(userId: string, event: string, data: Record<string, unknown>): boolean {
    const userSocketsSet = this.userSockets.get(userId);
    if (!userSocketsSet || userSocketsSet.size === 0) {
      logger.warn(`No sockets found for user ${userId}`);
      return false;
    }

    let sent = false;
    userSocketsSet.forEach(socket => {
      if (socket.connected) {
        socket.emit(event, data);
        sent = true;
      }
    });

    if (sent) {
      logger.info(`Sent ${event} to user ${userId} on ${userSocketsSet.size} socket(s)`);
    }

    return sent;
  }

  public getUserSocketCount(userId: string): number {
    const userSocketsSet = this.userSockets.get(userId);
    return userSocketsSet ? userSocketsSet.size : 0;
  }

  public isUserOnline(userId: string): boolean {
    return this.getUserSocketCount(userId) > 0;
  }
}

export const webSocketService = WebSocketService.getInstance();
