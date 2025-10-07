import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { feynmanController } from '@/controllers/feynman/feynman.controller';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes
router.post('/session', feynmanController.storageSessionFeynman);
router.post('/session/retrieval', feynmanController.getFeynmanSession);
router.post('/submit/review', feynmanController.updateReview);
router.post('/modify', feynmanController.updateSession);

// Register the router
registerRoute('/feynman', router, {
    description: 'Feynman API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
