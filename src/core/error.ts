import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '@/constants/index.constant';
import { config } from '@/config/env.config';
import logger from '@/utils/logger';

interface IError {
  statusCode: number;
  status: string;
  isOperational: boolean;
  message: string;
  stack?: string;
}

class AppError extends Error implements IError {
  public statusCode: number;
  public isOperational: boolean;
  public status: string;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class BadRequest extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
    this.name = 'BadRequest';
  }
}

const handleError = (error: unknown, _req: Request, res: Response, next: NextFunction): void => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(error.message, 500);
    appError.stack = error.stack;
  } else {
    appError = new AppError(
      typeof error === 'string' ? error : 'Unknown error',
      HTTP_STATUS.INTERNAL_SERVER
    );
  }

  appError.statusCode = appError.statusCode || HTTP_STATUS.INTERNAL_SERVER;
  appError.status = appError.status || 'error';

  logger.error(`[${appError.name || 'Error'}] ${appError.message}`, {
    statusCode: appError.statusCode,
    stack: appError.stack,
    isOperational: appError.isOperational,
  });

  if (config.isDevelopment) {
    res.status(appError.statusCode).json({
      status: appError.status,
      message: appError.message,
      stack: appError.stack,
      isOperational: appError.isOperational,
    });
  }

  res.status(appError.statusCode).json({
    status: appError.status,
    message: appError.message,
  });
};

const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('UNCAUGHT EXCEPTION!  Shutting down...', {
      message: error.message,
      stack: error.stack,
    });

    process.exit(1);
  });

  process.on('unhandledRejection', (reason: Error) => {
    logger.error('UNHANDLED REJECTION!  Shutting down...', {
      message: reason.message,
      stack: reason.stack,
    });

    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully');
    process.exit(0);
  });
};

export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  BadRequest,
  handleError,
  setupGlobalErrorHandlers,
};
