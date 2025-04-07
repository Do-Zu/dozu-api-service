import './register';
import { config } from './config/env.config';
import express, { Application, Request, Response } from 'express';
import logger from './utils/logger';

const app: Application = express();

const { host, port } = config.server;

logger.info(`Server is starting in ${config.env} mode...`);

app.get('/', async (req: Request, res: Response) => {
  logger.debug('Processing request to root endpoint');
  res.status(200).json({
    message: 'Hello, World!',
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://${host}:${port}`);
});

export default app;
