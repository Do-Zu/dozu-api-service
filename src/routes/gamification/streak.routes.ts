import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import { StreakController } from '@/controllers/gamification/streak.controller';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';

const router = Router();
const streakController = new StreakController();

globalAsyncHandler(router);
router.use(authMiddleware);

// GET /api/gamification/streak/stats - Get streak statistics
router.get('/stats', streakController.getStreakStats);

// POST /api/gamification/streak/update - Update user's streak (called when user studies)
router.post('/update', streakController.updateStreak);

// POST /api/gamification/streak/buy-freeze - Buy streak freeze with points
router.post('/buy-freeze', streakController.buyStreakFreeze);

// POST /api/gamification/streak/gift-freeze - Gift streak freeze (Admin only)
router.post('/gift-freeze', validateAdmin, streakController.giftStreakFreeze);

registerRoute('/gamification/streak', router, {
    description: 'Gamification Streak API for learning streaks',
    version: 'v1',
    isEnabled: true,
});

export const streakRouter = router;
