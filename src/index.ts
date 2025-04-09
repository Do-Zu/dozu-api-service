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
import cors from './config/middlewares/cors.config';
import rateLimit from './config/middlewares/rate-limit.config';

//!TESTING
import { getDb } from './libs/drizzleClient.lib';
import { usersTable } from './models';
import { eq } from 'drizzle-orm';

// setupGlobalErrorHandlers();

const app: Application = express();

app.set('trust proxy', true);

const { host, port } = config.server;

//Parsing middleware
app.use(parserMiddleware.json());
app.use(parserMiddleware.urlencoded());

app.use(helmet());
app.use(cors());

// Middleware to log requests
app.use(morganConfig);

//Rate limiting to all requests
if (config.isProduction) {
  app.use(rateLimit());
}

// Apply success handler middleware request
app.use(successHandler);

app.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Hello, World!',
  });
});

app.use('/api', router);

//begin of test drizzle
app.get('/testDrizzle', async (req: Request, res: Response) => {
  const db = getDb();

  async function main() {
    const user: typeof usersTable.$inferInsert = {
      name: 'John',
      age: 30,
      email: 'john4@example.com',
    };

    await db.insert(usersTable).values(user);
    console.log('New user created!');

    const users = await db.select().from(usersTable);
    console.log('Getting all users from the database: ', users);

    await db
      .update(usersTable)
      .set({
        age: 31,
      })
      .where(eq(usersTable.email, user.email));
    console.log('User info updated!');
  }

  main();

  res.status(200).json({
    message: 'Hello, World!',
  });
});
//end of test

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
