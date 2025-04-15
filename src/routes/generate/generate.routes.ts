import { Router } from 'express';
import { GenerateController } from '../../controllers/generate.controller';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import * as path from 'path';
import multer from 'multer';
import { generateConfig } from '@/config/generate.config';

const router = Router();

globalAsyncHandler(router);

const generateController = new GenerateController();

router.post('/upload', uploadMiddleware.single('file'), (req, res) =>
  generateController.handleFileUpload(req, res)
);

router.post('/text/flashcards', (req, res) => generateController.handleGenerateContent(req, res));
router.post(
  '/pdf/flashcards',
  uploadMiddleware.single('file'),
  generateController.handleGenerateContentPdf.bind(generateController)
);

// Route for checking processing status
router.get('/status/:id', (req, res) => generateController.getProcessingStatus(req, res));

registerRoute('/generate', router, {
  version: 'v1',
  isEnabled: true,
});

export const generateRoutes = router;
