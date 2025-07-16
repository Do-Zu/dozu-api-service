import { Router } from 'express';
import NotificationController from '@/controllers/notification/notification.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '../register.routes';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get('/user/:userId', NotificationController.getUserNotifications);

// Mark notification as read
router.patch('/user/:userId/:notificationId/read', NotificationController.markAsRead);

// Clear all notifications for user
router.delete('/user/:userId', NotificationController.clearNotifications);

// Send test notification (for development)
router.post('/test', NotificationController.sendTestNotification);

// Send daily reminder to specific user
router.post('/user/:userId/daily-reminder', NotificationController.sendDailyReminder);

// Send achievement notification to specific user
router.post('/user/:userId/achievement', NotificationController.sendAchievementNotification);

// Admin routes (require admin role)
// TODO: Add admin role middleware for these routes
router.post('/admin/system-announcement', NotificationController.sendSystemAnnouncement);
router.get('/admin/scheduler-status', NotificationController.getSchedulerStatus);

// Register the notification routes
registerRoute('/notifications', router, {
  description: 'User Notification API endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
