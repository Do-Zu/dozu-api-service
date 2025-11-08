import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger';

export class WebSocketService {
  protected static instance: WebSocketService;
  protected io: Server | null = null;
  protected activeSockets: Map<string, Socket> = new Map(); // jobId -> socket

  protected constructor() {}

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

      // Register the client with a specific generation job ID
      socket.on('register', (jobId: string) => {
        this.activeSockets.set(jobId, socket);
        logger.info(`Client ${socket.id} registered for job ${jobId}`);
      });

      socket.on('disconnect', () => {
        // Remove socket from active connections
        for (const [jobId, activeSocket] of this.activeSockets.entries()) {
          if (activeSocket.id === socket.id) {
            this.activeSockets.delete(jobId);
            logger.info(`Client ${socket.id} unregistered from job ${jobId}`);
          }
        }
        
        logger.info(`Client disconnected: ${socket.id}`);
        // Call hook for child classes to handle cleanup
        this.onSocketDisconnect(socket);
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

  /**
   * Hook method for child classes to handle socket disconnect
   * Override this in child classes to implement custom cleanup logic
   */
  protected onSocketDisconnect(socket: Socket): void {
    // Override in child classes
  }

  /**
   * Get the Socket.IO server instance
   * Useful for child classes or other services to access the io instance
   */
  public getIO(): Server | null {
    return this.io;
  }

  /**
   * Set the Socket.IO server instance (for sharing between services)
   * Allows child classes or other services to reuse the same io instance
   */
  protected setIO(io: Server): void {
    this.io = io;
  }

  /**
   * Check if the service is initialized
   */
  public isInitialized(): boolean {
    return this.io !== null;
  }
}

export const webSocketService = WebSocketService.getInstance();
