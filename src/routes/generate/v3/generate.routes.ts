import { Router } from 'express';
import { generateController } from '@/controllers/generate/v3/generate.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../../register.routes';

const router = Router();

globalAsyncHandler(router);

router.post('/text/llm', generateController.generateContent);

router.post('/text/llm/status', generateController.getGenerateContentStatus);

registerRoute('/generate/v3/', router, {
  version: 'v3',
  isEnabled: true,
});

export const generateRoutes = router;
