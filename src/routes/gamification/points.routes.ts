import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import { PointsController } from '@/controllers/gamification/points.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const pointsController = new PointsController();

globalAsyncHandler(router);
router.use(authMiddleware);

// GET /api/gamification/points - Get user's points
router.get('/', pointsController.getUserPoints);

// GET /api/gamification/points/user/:userId - Get gamification stats for specific user (teachers only)
router.get('/user/:userId', pointsController.getUserGamificationStats);

// GET /api/gamification/points/summary - Get point summary
router.get('/summary', pointsController.getPointSummary);

// GET /api/gamification/points/history - Get point transaction history
router.get('/history', pointsController.getPointHistory);

// POST /api/gamification/points/spend - Spend points
router.post('/spend', pointsController.spendPoints);

// Award points routes
router.post('/award/lesson', pointsController.awardLessonPoints);
router.post('/award/quiz', pointsController.awardQuizPoints);
router.post('/award/topic', pointsController.awardTopicPoints);
router.post('/award/flashcard', pointsController.awardFlashcardPoints);
router.post('/award/daily-goal', pointsController.awardDailyGoalPoints);

registerRoute('/gamification/points', router, {
    description: 'Gamification Points API for learning points and rewards',
    version: 'v1',
    isEnabled: true,
});

export default router;
