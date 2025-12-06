import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { uploadMiddleware } from '@/middleware/convert-upload.middleware';
import { convertController } from '@/controllers/convert/convert.controller';
// import { authMiddleware } from '@/middleware/auth.middleware';

/**
 * Convert routes
 * Follows Single Responsibility Principle - only handles routing
 */
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// router.use(authMiddleware);

/**
 * @route POST /convert/file
 * @description Convert uploaded file to PDF
 * @access Private (when auth is enabled)
 */
router.post('/file', uploadMiddleware.single('file'), (req, res) => convertController.convertFile(req, res));

/**
 * @route POST /convert/url
 * @description Convert URL to PDF
 * @access Private (when auth is enabled)
 */
router.post('/url', (req, res) => convertController.convertUrl(req, res));

// Register the router
registerRoute('/convert', router, {
    description: 'Convert API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
