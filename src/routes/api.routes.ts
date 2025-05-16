import express, { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { getRoutes, registerRoute } from './register.routes';
import logger from '@/utils/logger';

const router: Router = express.Router();

//import routers here
import './demo/demo.routes';
import './generate/v1/generate.routes';
import './generate/v3/generate.routes';
import './sse/sse.routes';
import './flashcard/flashcard.routes';
import './topic/topic.routes';
import './auth/auth.routes';

// Apply global async handler to router
globalAsyncHandler(router);

try {
  const registeredRoutes = getRoutes();

  if (registeredRoutes.length === 0) {
    logger.warn('No routes registered with the API router');
  }

  registeredRoutes.forEach(({ path, router: moduleRouter }) => {
    try {
      router.use(path, moduleRouter);
      logger.debug(`Mounted route: ${path}`);
    } catch (error) {
      logger.error(`Failed to mount route ${path}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
} catch (error) {
  logger.error('Error mounting API routes', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}

export default router;
