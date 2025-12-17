import { Router } from 'express';
import { feedbackController } from '@/controllers/feedback/feedback.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '../register.routes';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

const router = Router();
globalAsyncHandler(router);

// Feedback route - requires authentication
router.post(
    '/submit',
    authMiddleware,
    fileUploadSingleMiddleware,
    feedbackController.submitFeedback
);

// Register the feedback routes
registerRoute('/feedback', router, {
  description: 'User Feedback API endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
