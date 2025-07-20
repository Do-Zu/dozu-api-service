import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger';

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server | null = null;
  private activeSockets: Map<string, Socket> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(httpServer: HttpServer): void {
    if (this.io) return;

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupListeners();
    logger.info('WebSocket server initialized');
  }

  private setupListeners(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

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
      });
    });
  }

  public sendResult(jobId: string, data: any): boolean {
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
}

export const webSocketService = WebSocketService.getInstance();
