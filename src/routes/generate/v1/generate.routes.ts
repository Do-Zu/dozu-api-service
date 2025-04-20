import { Router } from 'express';
import { GenerateController } from '@/controllers/generate/v1/generate.controller';
import { uploadMiddleware } from '@/middleware/upload.middleware';
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

router.post('/text/algo/flashcards', (req, res) =>
  generateController.handleGenerateFlashCardAlgo(req, res)
);

router.post(
  '/pdf/flashcards',
  uploadMiddleware.single('file'),
  generateController.handleGenerateContentPdf.bind(generateController)
);

// Route for checking processing status
router.get('/status/:id', (req, res) => generateController.getProcessingStatus(req, res));

registerRoute('/generate/v1/', router, {
  version: 'v1',
  isEnabled: true,
});

export const generateRoutes = router;
