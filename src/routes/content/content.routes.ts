import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { youtubeContentController } from '@/controllers/content/youtube.content.controller';
// import { authMiddleware } from '@/middleware/auth.middleware';

const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// router.use(authMiddleware);

// Define routes
router.get('/youtube/transcript', youtubeContentController.getTranscript);

// Register the router
registerRoute('/content', router, {
    description: 'Content API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
