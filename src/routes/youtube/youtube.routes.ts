import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import { youtubeContentController } from '@/controllers/content/youtube/youtube.controller';

const router = express.Router();

globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/v3/transcript', youtubeContentController.getTranscript);

registerRoute('/youtube', router, {
    description: 'Youtube content API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
