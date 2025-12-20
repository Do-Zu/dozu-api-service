import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { Router } from 'express';
import mediaTranscriptionController from '../../features/media-transcription/mediaTranscription.controller';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import mediaMiddleware from '../../features/media-transcription/media.middleware';

const router = Router();

globalAsyncHandler(router);
router.use(authMiddleware);

const validateMiddleware = [mediaMiddleware.validateSizeLimit, mediaMiddleware.validateMimeType];
router.post('/', fileUploadSingleMiddleware, ...validateMiddleware, mediaTranscriptionController.handleTranscribe);

registerRoute('/v1/media-transcription', router, {
    description:
        'API for getting transcription of media file.',
    version: 'v1',
    isEnabled: true,
});

export const mediaTranscriptionRoutes = router;
