import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import { progressController } from '@/controllers/progress/progress.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

// Statistics and analytics endpoints (implemented)
router.get('/overview', progressController.getStatistics.bind(progressController));
router.get('/dashboard', progressController.getDashboardStatistics.bind(progressController));
router.get('/daily-study', progressController.getDailyStudyRecords.bind(progressController));
router.get('/learning-methods', progressController.getLearningMethodsDistribution.bind(progressController));
router.get('/weekly-comparison', progressController.getWeeklyComparison.bind(progressController));
router.get('/completed-topics', progressController.getCompletedTopics.bind(progressController));

// CRUD operations for progress
router.get('/', progressController.getAllProgress.bind(progressController));
router.get('/:id', progressController.getProgressById.bind(progressController));
router.post('/', progressController.createProgress.bind(progressController));
router.put('/', progressController.updateProgress.bind(progressController));
router.delete('/:id', progressController.deleteProgress.bind(progressController));

registerRoute('/progress', router, {
  description: 'Progress API for learning statistics',
  version: 'v1',
  isEnabled: true,
});

export default router;