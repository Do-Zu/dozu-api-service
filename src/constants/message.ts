export const ERROR_MESSAGES = {
    AUTHENTICATION_FAILED: 'Authentication failed',
    NOT_AUTHORIZED: 'Not authorized',
    NOT_FOUND: 'Resource not found',
    DATABASE_OPERATION_FAILED: 'Database operation failed',
    BAD_REQUEST: 'Bad Request',
    PAYMENT_REQUIRED: 'Payment Required',
    PAYLOAD_TOO_LARGE: 'Payload Too Large',
    FORBIDDEN: 'Forbidden',
    INTERNAL_SERVER_ERROR: 'Internal Server Error',
    SERVICE_UNAVAILABLE: 'Service Unavailable',

    SERVER_ERROR: 'Server Error',
    UNKNOWN_ERROR: 'Unknown error',
};

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

export const LOG_MESSAGES = {
    UNCAUGHT_EXCEPTION: 'UNCAUGHT EXCEPTION!  Shutting down...',
    UNHANDLED_REJECTION: 'UNHANDLED REJECTION!  Shutting down...',
    SIGTERM_RECEIVED: 'SIGTERM received. Shutting down gracefully',
    HEADERS_ALREADY_SENT: 'Attempted to send response when headers were already sent',
    ERROR_SENDING_RESPONSE: 'Error sending error response',
    ERROR_IN_ERROR_HANDLER: 'Error in error handler itself',
};
