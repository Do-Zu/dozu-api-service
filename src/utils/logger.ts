import { createLogger, format, transports } from 'winston';
import { config } from '@/config/env.config';

//  log levels and colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    return config?.env === 'production' ? 'error' : 'info';
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

format.colorize().addColors(colors);

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    format.errors({ stack: true }),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    format.colorize({ all: true }),
    format.printf(info => {
        const { timestamp, level, message, metadata } = info;
        let metaStr = '';

        if (metadata && Object.keys(metadata).length > 0) {
            metaStr = `\n${JSON.stringify(metadata, null, 2)}`;
        }

        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

const logTransports = [
    new transports.Console({
        level: config?.isProduction ? 'error' : 'info', // Only log error in production, info+ in dev
    }),

    new transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),

    new transports.File({
        filename: 'logs/all.log',
        level: config?.isProduction ? 'error' : 'info', // Only log error in production, info+ in dev
    }),
];

const logger = createLogger({
    level: level(),
    levels,
    format: logFormat,
    transports: logTransports,
    exitOnError: false,
});

export default logger;
