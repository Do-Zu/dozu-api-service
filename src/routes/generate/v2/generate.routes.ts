import { Router } from 'express';
import { GenerateController } from '@/controllers/generate/v2/generate.controller';
import { uploadMiddleware } from '../../../middleware/upload.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../../register.routes';

const router = Router();

globalAsyncHandler(router);

const generateController = new GenerateController();

router.post('/upload', uploadMiddleware.single('file'), (req, res) =>
  generateController.handleFileUpload(req, res)
);

router.post('/text/llm/flashcards', (req, res) =>
  generateController.handleGenerateFlashCardLLM(req, res)
);

router.post('/text/llm/quizzes', (req, res) =>
  generateController.handleGenerateQuizzesLLM(req, res)
);

router.post(
  '/pdf/llm/flashcards',
  uploadMiddleware.single('file'),
  generateController.handleGenerateContentPdf.bind(generateController)
);

registerRoute('/generate/v2/', router, {
  version: 'v1',
  isEnabled: true,
});

export const generateRoutes = router;
