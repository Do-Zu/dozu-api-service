import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { feynmanController } from '@/controllers/feynman/feynman.controller';
import { validateCompareSimilarQuestionAnswer } from '@/middleware/validations/feynman/feynman.validation';
import { authMiddleware } from '@/middleware/auth.middleware';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

router.use(authMiddleware);

// Define routes
router.post('/session', feynmanController.storageSessionFeynman);
router.post('/session/retrieval', feynmanController.getFeynmanSession);
router.post('/submit/review', feynmanController.updateReview);
router.post('/modify', feynmanController.updateSession);
router.post(
    '/compare/similarity',
    validateCompareSimilarQuestionAnswer(),
    feynmanController.compareSimilarQuestionAnswer
);

// Register the router
registerRoute('/feynman', router, {
    description: 'Feynman API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
