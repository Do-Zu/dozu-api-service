import { Router } from 'express';
import { generateController } from '@/controllers/generate/v3/generate.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../../register.routes';
import subscriptionMiddleware from '@/middleware/subscription/subscript.middleware';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();

globalAsyncHandler(router);

router.use(authMiddleware);

router.post('/text/llm', subscriptionMiddleware.handleSubscription, generateController.generateContent);

router.post('/text/llm/status', generateController.getGenerateContentStatus);

router.post('/llm/stream', generateController.streamGenerateContent)

registerRoute('/generate/v3/', router, {
    version: 'v3',
    isEnabled: true,
});

export const generateRoutes = router;
