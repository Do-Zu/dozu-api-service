import { Router } from 'express';
import { sseController } from '@/controllers/sse/sse.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';

const router = Router();

globalAsyncHandler(router);

//TODO: add auth for routes
//....

router.get('/job/:jobId', sseController.connectToJobEvents);

// Admin monitoring endpoint (Admin Only)
router.get('/stats', sseController.getStats);

registerRoute('/event/generate', router, {
  version: 'v1',
  isEnabled: true,
});

export const sseRoutes = router;
