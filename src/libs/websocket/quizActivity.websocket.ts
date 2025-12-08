import { Socket } from 'socket.io';
import logger from '@/utils/logger';
import { WebSocketService, webSocketService } from './socket.io';
import { Server as HttpServer } from 'http';

/**
 * Quiz Activity WebSocket Service
 * Handles realtime tracking of student quiz activity in class quizzes
 * Uses rooms to group sockets by classQuizId for efficient broadcasting
 */
export class QuizActivityWebSocketService extends WebSocketService {
  private static quizActivityInstance: QuizActivityWebSocketService;
  
  // Store socket info: socketId -> { userId, classQuizId, attemptId }
  private socketInfo: Map<string, { userId: number; classQuizId: number; attemptId?: number }> = new Map();
  
  // Store room participants: classQuizId -> Set of socketIds
  private quizRooms: Map<number, Set<string>> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): QuizActivityWebSocketService {
    if (!QuizActivityWebSocketService.quizActivityInstance) {
      QuizActivityWebSocketService.quizActivityInstance = new QuizActivityWebSocketService();
    }
    return QuizActivityWebSocketService.quizActivityInstance;
  }

  public initialize(httpServer: HttpServer): void {
    // Reuse the base WebSocketService's io instance if it's already initialized
    const baseIO = webSocketService.getIO();
    
    if (baseIO) {
      this.setIO(baseIO);
    } else {
      webSocketService.initialize(httpServer);
      const io = webSocketService.getIO();
      if (io) {
        this.setIO(io);
      } else {
        logger.error('Failed to initialize base WebSocketService');
        return;
      }
    }
    
    this.setupQuizActivityListeners();
    logger.info('Quiz Activity WebSocket service initialized');
  }

  private setupQuizActivityListeners(): void {
    const io = this.getIO();
    if (!io) {
      logger.warn('Cannot setup quiz activity listeners: IO instance not available');
      return;
    }

    // Listen for new connections
    io.on('connection', (socket: Socket) => {
      this.setupSocketListeners(socket);
    });
  }

  private setupSocketListeners(socket: Socket): void {
    // Join quiz room for monitoring
    socket.on('join-quiz-room', async (data: { classQuizId: number; userId: number }) => {
      await this.joinQuizRoom(socket, data.classQuizId, data.userId);
    });

    // Register attempt start
    socket.on('quiz-attempt-started', (data: { classQuizId: number; userId: number; attemptId: number }) => {
      this.handleAttemptStarted(socket, data);
    });

    // Track answer save
    socket.on('quiz-answer-saved', (data: { 
      classQuizId: number; 
      userId: number; 
      attemptId: number;
      questionIndex: number;
      answerIndex: number | null;
      isCorrect?: boolean | null;
    }) => {
      this.handleAnswerSaved(socket, data);
    });

    // Track attempt submission
    socket.on('quiz-attempt-submitted', (data: { 
      classQuizId: number; 
      userId: number; 
      attemptId: number;
      score?: number;
    }) => {
      this.handleAttemptSubmitted(socket, data);
    });

    // Track activity (focus/blur, time updates, etc.)
    socket.on('quiz-activity', (data: {
      classQuizId: number;
      userId: number;
      attemptId: number;
      activityType: 'focus' | 'blur' | 'time-update' | 'question-change';
      metadata?: Record<string, unknown>;
    }) => {
      this.handleActivity(socket, data);
    });

    // Leave quiz room
    socket.on('leave-quiz-room', (data: { classQuizId: number }) => {
      this.leaveQuizRoom(socket, data.classQuizId);
    });
  }

  /**
   * Join a quiz room for realtime monitoring
   */
  private async joinQuizRoom(socket: Socket, classQuizId: number, userId: number): Promise<void> {
    try {
      const roomName = `quiz:${classQuizId}`;
      
      // Join the room
      socket.join(roomName);
      
      // Store socket info
      this.socketInfo.set(socket.id, { userId, classQuizId });
      
      // Track room participants
      if (!this.quizRooms.has(classQuizId)) {
        this.quizRooms.set(classQuizId, new Set());
      }
      this.quizRooms.get(classQuizId)!.add(socket.id);
      
      logger.info(`Socket ${socket.id} (User ${userId}) joined quiz room ${classQuizId}`);
      
      // Notify others in the room (optional - for teacher monitoring)
      socket.to(roomName).emit('student-joined', {
        classQuizId,
        userId,
        socketId: socket.id,
      });
      
      // Confirm join to client
      socket.emit('quiz-room-joined', { classQuizId, userId });
    } catch (error) {
      logger.error(`Failed to join quiz room ${classQuizId} for socket ${socket.id}:`, error);
    }
  }

  /**
   * Leave a quiz room
   */
  private leaveQuizRoom(socket: Socket, classQuizId: number): void {
    try {
      const roomName = `quiz:${classQuizId}`;
      socket.leave(roomName);
      
      // Remove from room tracking
      const roomSockets = this.quizRooms.get(classQuizId);
      if (roomSockets) {
        roomSockets.delete(socket.id);
        if (roomSockets.size === 0) {
          this.quizRooms.delete(classQuizId);
        }
      }
      
      // Remove socket info
      const info = this.socketInfo.get(socket.id);
      if (info) {
        const { userId } = info;
        logger.info(`Socket ${socket.id} (User ${userId}) left quiz room ${classQuizId}`);
        
        // Notify others in the room
        socket.to(roomName).emit('student-left', {
          classQuizId,
          userId,
          socketId: socket.id,
        });
      }
      
      this.socketInfo.delete(socket.id);
    } catch (error) {
      logger.error(`Failed to leave quiz room ${classQuizId} for socket ${socket.id}:`, error);
    }
  }

  /**
   * Handle attempt started event
   */
  private handleAttemptStarted(
    socket: Socket,
    data: { classQuizId: number; userId: number; attemptId: number }
  ): void {
    const { classQuizId, userId, attemptId } = data;
    const roomName = `quiz:${classQuizId}`;
    
    // Update socket info
    const info = this.socketInfo.get(socket.id);
    if (info) {
      info.attemptId = attemptId;
    }
    
    // Broadcast to all in room (teachers monitoring)
    socket.to(roomName).emit('quiz-attempt-started', {
      classQuizId,
      userId,
      attemptId,
      timestamp: new Date().toISOString(),
    });
    
    logger.info(`Quiz attempt started: User ${userId}, Quiz ${classQuizId}, Attempt ${attemptId}`);
  }

  /**
   * Handle answer saved event
   */
  private handleAnswerSaved(
    socket: Socket,
    data: {
      classQuizId: number;
      userId: number;
      attemptId: number;
      questionIndex: number;
      answerIndex: number | null;
      isCorrect?: boolean | null;
    }
  ): void {
    const { classQuizId, userId, attemptId, questionIndex, answerIndex, isCorrect } = data;
    const roomName = `quiz:${classQuizId}`;
    
    // Broadcast to all in room (teachers monitoring)
    socket.to(roomName).emit('quiz-answer-saved', {
      classQuizId,
      userId,
      attemptId,
      questionIndex,
      answerIndex,
      isCorrect: isCorrect ?? null,
      timestamp: new Date().toISOString(),
    });
    
    logger.debug(`Quiz answer saved: User ${userId}, Quiz ${classQuizId}, Question ${questionIndex}, Correct: ${isCorrect}`);
  }

  /**
   * Handle attempt submitted event
   */
  private handleAttemptSubmitted(
    socket: Socket,
    data: {
      classQuizId: number;
      userId: number;
      attemptId: number;
      score?: number;
    }
  ): void {
    const { classQuizId, userId, attemptId, score } = data;
    const roomName = `quiz:${classQuizId}`;
    
    // Broadcast to all in room (teachers monitoring)
    socket.to(roomName).emit('quiz-attempt-submitted', {
      classQuizId,
      userId,
      attemptId,
      score,
      timestamp: new Date().toISOString(),
    });
    
    logger.info(`Quiz attempt submitted: User ${userId}, Quiz ${classQuizId}, Attempt ${attemptId}, Score: ${score}`);
  }

  /**
   * Handle general activity events (focus, blur, time updates, etc.)
   */
  private handleActivity(
    socket: Socket,
    data: {
      classQuizId: number;
      userId: number;
      attemptId: number;
      activityType: 'focus' | 'blur' | 'time-update' | 'question-change';
      metadata?: Record<string, unknown>;
    }
  ): void {
    const { classQuizId, userId, attemptId, activityType, metadata } = data;
    const roomName = `quiz:${classQuizId}`;
    
    // Broadcast to all in room (teachers monitoring)
    socket.to(roomName).emit('quiz-activity', {
      classQuizId,
      userId,
      attemptId,
      activityType,
      metadata,
      timestamp: new Date().toISOString(),
    });
    
    logger.debug(`Quiz activity: User ${userId}, Quiz ${classQuizId}, Type: ${activityType}`);
  }

  /**
   * Handle socket disconnect - called by parent class
   */
  protected onSocketDisconnect(socket: Socket): void {
    const info = this.socketInfo.get(socket.id);
    if (info) {
      const { classQuizId, userId } = info;
      this.leaveQuizRoom(socket, classQuizId);
      logger.info(`Socket ${socket.id} (User ${userId}) disconnected from quiz activity`);
    }
  }

  /**
   * Manually emit activity update (for use in services/controllers)
   */
  public emitActivityUpdate(
    classQuizId: number,
    event: string,
    data: Record<string, unknown>
  ): void {
    const io = this.getIO();
    if (!io) {
      logger.warn('Cannot emit activity update: IO instance not available');
      return;
    }

    const roomName = `quiz:${classQuizId}`;
    io.to(roomName).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get active participants in a quiz room
   */
  public getActiveParticipants(classQuizId: number): number {
    const roomSockets = this.quizRooms.get(classQuizId);
    return roomSockets ? roomSockets.size : 0;
  }
}

export const quizActivityWebSocketService = QuizActivityWebSocketService.getInstance();


