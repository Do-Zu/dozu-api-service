import { NextFunction, Request, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS, LOG_MESSAGES } from '@/constants/index.constant';
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
    constructor(message = ERROR_MESSAGES.AUTHENTICATION_FAILED) {
        super(message, HTTP_STATUS.UNAUTHORIZED);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = ERROR_MESSAGES.NOT_AUTHORIZED) {
        super(message, HTTP_STATUS.FORBIDDEN);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = ERROR_MESSAGES.NOT_FOUND) {
        super(message, HTTP_STATUS.NOT_FOUND);
        this.name = 'NotFoundError';
    }
}

class DatabaseError extends AppError {
    constructor(message = ERROR_MESSAGES.DATABASE_OPERATION_FAILED) {
        super(message, HTTP_STATUS.INTERNAL_SERVER);
        this.name = 'DatabaseError';
    }
}

class BadRequest extends AppError {
    constructor(message = ERROR_MESSAGES.BAD_REQUEST) {
        super(message, HTTP_STATUS.BAD_REQUEST);
        this.name = 'BadRequest';
    }
}

class PaymentRequire extends AppError {
    constructor(message = ERROR_MESSAGES.PAYMENT_REQUIRED) {
        super(message, HTTP_STATUS.PAYMENT_REQUIRED);
        this.name = 'PaymentRequire';
    }
}

class PayloadTooLarge extends AppError {
    constructor(message = ERROR_MESSAGES.PAYLOAD_TOO_LARGE) {
        super(message, HTTP_STATUS.PAYLOAD_TOO_LARGE);
        this.name = 'PayloadTooLarge';
    }
}

class Forbidden extends AppError {
    constructor(message = ERROR_MESSAGES.FORBIDDEN) {
        super(message, HTTP_STATUS.FORBIDDEN);
        this.name = 'Forbidden';
    }
}

class InternalServerError extends AppError {
    constructor(message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR) {
        super(message, HTTP_STATUS.INTERNAL_SERVER);
        this.name = 'InternalServerError';
    }
}

class ServiceUnavailable extends AppError {
    constructor(message = ERROR_MESSAGES.SERVICE_UNAVAILABLE) {
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
        logger.warn(LOG_MESSAGES.HEADERS_ALREADY_SENT);
        return next(error);
    }
    try {
        let appError: AppError;

        if (error instanceof AppError) {
            appError = error;
        } else if (error instanceof Error) {
            const message = config.isDevelopment ? error.message : ERROR_MESSAGES.SERVER_ERROR;
            appError = new AppError(message, HTTP_STATUS.INTERNAL_SERVER);
            appError.stack = error.stack;
        } else {
            appError = new AppError(
                typeof error === 'string' ? error : ERROR_MESSAGES.UNKNOWN_ERROR,
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
            logger.error(LOG_MESSAGES.ERROR_SENDING_RESPONSE, { error: responseError });
        }
    } catch (error) {
        logger.error(LOG_MESSAGES.ERROR_IN_ERROR_HANDLER, { error });
        res.status(HTTP_STATUS.INTERNAL_SERVER).json({
            status: 'error',
            code: HTTP_STATUS.INTERNAL_SERVER,
            message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

const setupGlobalErrorHandlers = (): void => {
    process.on('uncaughtException', (error: Error) => {
        logger.error(LOG_MESSAGES.UNCAUGHT_EXCEPTION, {
            message: error.message,
            stack: error.stack,
        });

        // process.exit(1);
        // In production, you might want to implement a restart mechanism here
        // instead of just logging and continuing
    });

    process.on('unhandledRejection', (reason: Error) => {
        logger.error(LOG_MESSAGES.UNHANDLED_REJECTION, {
            message: reason.message,
            stack: reason.stack,
        });

        // process.exit(1);
        // Implement graceful shutdown but don't exit immediately
    });

    process.on('SIGTERM', async () => {
        logger.info(LOG_MESSAGES.SIGTERM_RECEIVED);
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
