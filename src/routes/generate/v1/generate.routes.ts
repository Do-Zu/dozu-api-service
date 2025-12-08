import { Router } from 'express';
import { generateController } from '@/controllers/generate/v1/generate.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../../register.routes';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/status/:jobId', generateController.getProcessingStatus.bind(generateController));

// Large file processing with progress tracking
router.get('/progress/:jobId', generateController.getFileProcessingProgress.bind(generateController));

registerRoute('/generate/v1/', router, {
    version: 'v1',
    isEnabled: true,
});

export const generateRoutes = router;
