import { Router } from 'express';
import { SSEController } from '@/controllers/sse/sse.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';

const router = Router();

globalAsyncHandler(router);

//TODO: add auth for routes
//....

router.get('/job/:jobId', SSEController.connectToJobEvents);

// Admin monitoring endpoint (Admin Only)
router.get('/stats', SSEController.getStats);

registerRoute('/event/generate', router, {
  version: 'v1',
  isEnabled: true,
});

export const sseRoutes = router;
