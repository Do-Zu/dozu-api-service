import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '@/constants/index.constant';
import { config } from '@/config/env.config';
import logger from '@/utils/logger';
import { closeDb } from '@/libs/drizzleClient.lib';

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
        super(message, HTTP_STATUS.UNAUTHORIZED);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Not authorized') {
        super(message, HTTP_STATUS.FORBIDDEN);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, HTTP_STATUS.NOT_FOUND);
        this.name = 'NotFoundError';
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, HTTP_STATUS.INTERNAL_SERVER);
        this.name = 'DatabaseError';
    }
}

class BadRequest extends AppError {
    constructor(message = 'Bad Request') {
        super(message, HTTP_STATUS.BAD_REQUEST);
        this.name = 'BadRequest';
    }
}

class PaymentRequire extends AppError {
    constructor(message = 'Payment Required') {
        super(message, HTTP_STATUS.PAYMENT_REQUIRED);
        this.name = 'PaymentRequire';
    }
}

class PayloadTooLarge extends AppError {
    constructor(message = 'Payload Too Large') {
        super(message, HTTP_STATUS.PAYLOAD_TOO_LARGE);
        this.name = 'PayloadTooLarge';
    }
}

class Forbidden extends AppError {
    constructor(message = 'Forbidden') {
        super(message, HTTP_STATUS.FORBIDDEN);
        this.name = 'Forbidden';
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal Server Error') {
        super(message, HTTP_STATUS.INTERNAL_SERVER);
        this.name = 'InternalServerError';
    }
}

class ServiceUnavailable extends AppError {
    constructor(message = 'Service Unavailable') {
        super(message, HTTP_STATUS.SERVICE_UNAVAILABLE);
        this.name = 'ServiceUnavailable';
    }
}
/**
 *
 * Global error handler middleware
 * Ensure server never crash in any situation
 */
const handleError = (error: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
        logger.warn('Attempted to send response when headers were already sent');
        return next(error);
    }
    try {
        let appError: AppError;

        if (error instanceof AppError) {
            appError = error;
        } else if (error instanceof Error) {
            appError = new AppError(error.message, 500);
            appError.stack = error.stack;
        } else {
            appError = new AppError(typeof error === 'string' ? error : 'Unknown error', HTTP_STATUS.INTERNAL_SERVER);
        }

        appError.statusCode = appError.statusCode || HTTP_STATUS.INTERNAL_SERVER;
        appError.status = appError.status || 'error';

        logger.error(`[${appError.name || 'Error'}] ${appError.message}`, {
            statusCode: appError.statusCode,
            stack: appError.stack,
            isOperational: appError.isOperational,
        });

        try {
            if (config.isDevelopment) {
                res.status(appError.statusCode).json({
                    status: appError.status,
                    code: appError.statusCode,
                    message: appError.message,
                    stack: appError.stack,
                    isOperational: appError.isOperational,
                });
            } else {
                res.status(appError.statusCode).json({
                    status: appError.status,
                    code: appError.statusCode,
                    message: appError.message,
                });
            }
        } catch (responseError) {
            logger.error('Error sending error response', { error: responseError });
        }
    } catch (error) {
        logger.error('Error in error handler itself', { error });
        res.status(HTTP_STATUS.INTERNAL_SERVER).json({
            status: 'error',
            code: HTTP_STATUS.INTERNAL_SERVER,
            message: 'Internal Server Error',
        });
    }
};

const setupGlobalErrorHandlers = (): void => {
    process.on('uncaughtException', (error: Error) => {
        logger.error('UNCAUGHT EXCEPTION!  Shutting down...', {
            message: error.message,
            stack: error.stack,
        });

        // process.exit(1);
        // In production, you might want to implement a restart mechanism here
        // instead of just logging and continuing
    });

    process.on('unhandledRejection', (reason: Error) => {
        logger.error('UNHANDLED REJECTION!  Shutting down...', {
            message: reason.message,
            stack: reason.stack,
        });

        // process.exit(1);
        // Implement graceful shutdown but don't exit immediately
    });

    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received. Shutting down gracefully');
        await closeDb();
        process.exit(0);
        // Implement graceful shutdown but don't exit immediately
    });
};

export {
    AppError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    DatabaseError,
    BadRequest,
    PaymentRequire,
    PayloadTooLarge,
    Forbidden,
    InternalServerError,
    ServiceUnavailable,
    handleError,
    setupGlobalErrorHandlers,
};
