import './register';
import express, { Application, Request, Response, NextFunction } from 'express';
import { config } from './config/env.config';
import { handleError, NotFoundError, setupGlobalErrorHandlers } from './core/error';
import { parserMiddleware } from './config/middlewares/parse.config';
import logger from './utils/logger';
import morganConfig from './config/middlewares/morgan.config';
import successHandler from './core/success';
import router from './routes/api.routes';
import helmet from './config/middlewares/helmet.config';
import cookieParser from 'cookie-parser';
import cors from './config/middlewares/cors.config';
import rateLimit from './config/middlewares/rate-limit.config';
import { db } from './libs/drizzleClient.lib';
import NotificationScheduler from './services/notification/notification.scheduler';
import { createServer } from 'http';
import { webSocketService } from './libs/websocket/socket.io';

setupGlobalErrorHandlers();

const app: Application = express();

// Configure trust proxy for rate limiting and IP detection
// This allows Express to trust reverse proxy headers like X-Forwarded-For
// Essential for apps running behind reverse proxies.
app.set('trust proxy', config.trustProxy);

// const httpServer = createServer(app);

const { host, port } = config.server;

//Parsing middleware
app.use(parserMiddleware.json());
app.use(parserMiddleware.urlencoded());

app.use(helmet());
app.use(cors());

app.use(cookieParser());

// Middleware to log requests
app.use(morganConfig);

//Rate limiting to all requests
if (config.isProduction) {
  app.use(rateLimit());
}

// webSocketService.initialize(httpServer);

// Apply success handler middleware request
app.use(successHandler);

app.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Hello, World!',
    code: 200,
    status: 'success',
  });
});

app.use('/api', router);

// Handle 404 errors for undefined routes
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global error handler
app.use(handleError);

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize WebSocket server
webSocketService.initialize(httpServer);

// Start server
const server = httpServer.listen(port, () => {
  db();
  
  // Initialize notification scheduler
  NotificationScheduler.init();
  
  logger.info(`Server is running at http://${host}:${port}`);
  logger.info('WebSocket server initialized and ready for connections');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  
  // Stop notification scheduler
  NotificationScheduler.stopAll();
  
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;
