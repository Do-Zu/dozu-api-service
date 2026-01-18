import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { generateController } from '@/controllers/generate/v4/generate.controller';

const router = Router();

globalAsyncHandler(router);

router.use(authMiddleware);

router.post('/stream-http/llm', generateController.httpStreamGenerateContent);

export const generateV4Routes = router;
