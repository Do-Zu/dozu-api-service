import morgan, { StreamOptions } from 'morgan';
import logger from '@/utils/logger';
import { config } from '@/config/env.config';

// morgan.token('response-time', (req: Request, res: Response) => {
//   if (!req._startAt || !res._startAt) {
//     // Missing request/response start time
//     return '';
//   }

//   // Calculate elapsed time
//   const ms =
//     (res._startAt[0] - req._startAt[0]) * 1000 + (res._startAt[1] - req._startAt[1]) * 1e-6;

//   return ms.toFixed(3);
// });

// Create a stream that writes to Winston logger
const stream: StreamOptions = {
  write: (message: string) => {
    // Remove trailing newline
    const log = message.trim();
    logger.http(log);
  },
};

//  formats for development and production
const developmentFormat = ':method :url :status :response-time ms - :res[content-length]';
const productionFormat =
  ':remote-addr - :method :url :status :response-time ms - :res[content-length]';

// Create middleware based on environment
const morganMiddleware = morgan(
  config.env === 'development' ? developmentFormat : productionFormat,
  {
    stream,
    // Only log error responses in production
    skip: (req, res) => config.env === 'production' && res.statusCode < 400,
  }
);

export default morganMiddleware;
