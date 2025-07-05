import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import { trackingController } from '@/controllers/tracking/tracking.controller';

const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

router.use(authMiddleware);

// Define routes
router.get('/current-learning', trackingController.getCurrentLearningTopicProgressTracking);
router.post('/active-learning', trackingController.requestTrackingTimeLearningActive);

// Register the router
registerRoute('/tracking', router, {
    description: 'Tracking API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
