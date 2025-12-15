import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { Router } from 'express';
import audioTranscriptionController from '../../features/audio-transcription/audioTranscription.controller';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import audioMiddleware from '../../features/audio-transcription/audio.middleware';

const router = Router();

globalAsyncHandler(router);
router.use(authMiddleware);

const validateAudioMiddleware = [audioMiddleware.validateAudioSizeLimit, audioMiddleware.validateAudioMimeType];
router.post('/', fileUploadSingleMiddleware, ...validateAudioMiddleware, audioTranscriptionController.handleTranscribe);

registerRoute('/v1/media-transcription', router, {
    description:
        'API for getting transcription of media file. This route is currently using audioTranscription controller (would change in the future, after testing if media transcription is feasible in production).',
    version: 'v1',
    isEnabled: true,
});

export const mediaTranscriptionRoutes = router;
