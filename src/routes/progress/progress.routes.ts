import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import { progressController } from '@/controllers/progress/progress.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

// Test endpoint without auth
router.get('/test', (req, res) => {
  res.json({ message: 'Progress API is working!', timestamp: new Date().toISOString() });
});

// Test endpoint with auth but no user data required
router.get('/auth-test', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Authentication successful!', 
    timestamp: new Date().toISOString(),
    user: req.currentUser ? 'User authenticated' : 'No user data'
  });
});

// Protected routes
router.use(authMiddleware);

// CRUD operations for progress
router.get('/', progressController.getAllProgress.bind(progressController));
router.get('/:id', progressController.getProgressById.bind(progressController));
router.post('/', progressController.createProgress.bind(progressController));
router.put('/:id', progressController.updateProgress.bind(progressController));
router.delete('/:id', progressController.deleteProgress.bind(progressController));

// Statistics and analytics endpoints (implemented)
router.get('/stats/overview', progressController.getStatistics.bind(progressController));
router.get('/stats/dashboard', progressController.getDashboardStatistics.bind(progressController));
router.get('/stats/daily-study', progressController.getDailyStudyRecords.bind(progressController));
router.get('/stats/learning-methods', progressController.getLearningMethodsDistribution.bind(progressController));
router.get('/stats/weekly-comparison', progressController.getWeeklyComparison.bind(progressController));
router.get('/stats/completed-topics', progressController.getCompletedTopics.bind(progressController));

registerRoute('/progress', router, {
  description: 'Progress API for learning statistics',
  version: 'v1',
  isEnabled: true,
});

export default router;