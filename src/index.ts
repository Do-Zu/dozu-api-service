import './register';
import { config } from './config/env.config';
import express, { Application, Request, Response, NextFunction } from 'express';
import logger from './utils/logger';
import { handleError, NotFoundError, setupGlobalErrorHandlers } from './core/error';
import morganConfig from './config/morgan.config';
import successHandler from './core/success';
import router from './routes/api.routes';

// setupGlobalErrorHandlers();

const app: Application = express();

const { host, port } = config.server;

// Middleware to log requests
app.use(morganConfig);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply success handler middleware request
app.use(successHandler);

app.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Hello, World!',
  });
});

app.use('/api', router);

// Handle 404 errors for undefined routes
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global error handler
app.use(handleError);

const server = app.listen(port, () => {
  console.log(`Server is running at http://${host}:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;
