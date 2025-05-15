import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { recommendationController } from '@/controllers/recommendation/recommendation.controller';

const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes
router.get('/test-content-based', recommendationController.testContentBasedRecommendations);

// Register the router
registerRoute('/recommendation', router, {
  description: 'Recommendation API endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
