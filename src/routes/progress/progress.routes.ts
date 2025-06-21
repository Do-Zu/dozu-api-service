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

router.get('/statistics', progressController.getStatistics.bind(progressController));
router.get('/dashboard', progressController.getDashboardStatistics.bind(progressController));

// New endpoints for client data
router.get('/daily-study', progressController.getDailyStudyRecords.bind(progressController));
router.get('/learning-methods', progressController.getLearningMethodsDistribution.bind(progressController));
router.get('/weekly-comparison', progressController.getWeeklyComparison.bind(progressController));
router.get('/completed-topics', progressController.getCompletedTopics.bind(progressController));

registerRoute('/progress', router, {
  description: 'Progress API for learning statistics',
  version: 'v1',
  isEnabled: true,
});

export default router;