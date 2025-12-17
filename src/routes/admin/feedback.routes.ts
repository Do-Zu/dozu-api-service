import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminFeedbackController } from '@/controllers/admin/feedback.controller';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// Default: importantOnly=true => score>=3
router.get('/', adminFeedbackController.getAllFeedback.bind(adminFeedbackController));
router.patch('/:id', adminFeedbackController.updateFeedback.bind(adminFeedbackController));

// Ops endpoint for Phase 1 rule (can be wired into cron later)
router.post('/ops/auto-ignore', adminFeedbackController.runAutoIgnore.bind(adminFeedbackController));

registerRoute('/admin/feedback', router, {
  description: 'Admin Feedback Dashboard API',
  version: 'v1',
  isEnabled: true,
});

export const adminFeedbackRoutes = router;
