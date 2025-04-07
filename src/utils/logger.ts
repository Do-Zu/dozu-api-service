import { createLogger, format, transports } from 'winston';
import { config } from '@/config/env.config';

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine level based on environment
const level = () => {
  return config.env === 'production' ? 'error' : 'debug';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
format.colorize().addColors(colors);

// Define the format for logs
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.colorize({ all: true }),
  format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define transports for logs
const logTransports = [
  // Console transport for all logs
  new transports.Console(),

  // File transport for errors
  new transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),

  // File transport for all logs
  new transports.File({ filename: 'logs/all.log' }),
];

// Create the logger
const logger = createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports: logTransports,
  exitOnError: false,
});

export default logger;
