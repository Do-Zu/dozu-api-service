import { Router } from 'express';
import { GenerateController } from '@/controllers/generate/v3/generate.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../../register.routes';

const router = Router();

globalAsyncHandler(router);

const generateController = new GenerateController();

router.post('/text/llm/flashcards', (req, res) => generateController.generateFlashcards(req, res));

router.post('/text/llm/flashcards/status', (req, res) =>
  generateController.getGenerateFlashcardStatus(req, res)
);

registerRoute('/generate/v3/', router, {
  version: 'v3',
  isEnabled: true,
});

export const generateRoutes = router;
