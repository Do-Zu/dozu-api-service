import { Request, Response } from 'express';
import NotificationService from '@/services/notification/notification.service';
import NotificationScheduler from '@/services/notification/notification.scheduler';
import { SuccessResponse } from '@/core/success';
import { BadRequest, NotFoundError, InternalServerError } from '@/core/error';
import logger from '@/utils/logger';

export class NotificationController {
  /**
   * Get user's notifications
   */
  static async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        throw new BadRequest('Invalid user ID');
      }

      const notifications = NotificationService.getUserNotifications(userId);
      
      SuccessResponse.ok(res, {
        notifications,
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length
      }, 'Notifications retrieved successfully');
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw new InternalServerError('Failed to get notifications');
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const notificationId = req.params.notificationId;
      
      if (isNaN(userId)) {
        throw new BadRequest('Invalid user ID');
      }

      const success = NotificationService.markNotificationAsRead(userId, notificationId);
      
      if (success) {
        SuccessResponse.ok(res, null, 'Notification marked as read');
      } else {
        throw new NotFoundError('Notification not found');
      }
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      if (error instanceof BadRequest || error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Failed to mark notification as read');
    }
  }

  /**
   * Clear all notifications for user
   */
  static async clearNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        throw new BadRequest('Invalid user ID');
      }

      NotificationService.clearUserNotifications(userId);
      
      SuccessResponse.ok(res, null, 'All notifications cleared');
    } catch (error) {
      logger.error('Error clearing notifications:', error);
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new InternalServerError('Failed to clear notifications');
    }
  }

  /**
   * Send test notification (for development/admin use)
   */
  static async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, title, message, type = 'system' } = req.body;
      
      if (!userId || !title || !message) {
        throw new BadRequest('userId, title, and message are required');
      }

      const success = await NotificationService.sendRealtimeNotification({
        userId: parseInt(userId),
        type,
        title,
        message,
        data: { test: true },
        timestamp: new Date(),
        read: false
      });

      if (success) {
        SuccessResponse.ok(res, null, 'Test notification sent successfully');
      } else {
        throw new InternalServerError('Failed to send test notification');
      }
    } catch (error) {
      logger.error('Error sending test notification:', error);
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new InternalServerError('Failed to send test notification');
    }
  }

  /**
   * Send daily reminder to user
   */
  static async sendDailyReminder(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        throw new BadRequest('Invalid user ID');
      }

      const success = await NotificationService.sendDailyReminder(userId);
      
      if (success) {
        SuccessResponse.ok(res, null, 'Daily reminder sent successfully');
      } else {
        throw new NotFoundError('Failed to send daily reminder or user has disabled notifications');
      }
    } catch (error) {
      logger.error('Error sending daily reminder:', error);
      if (error instanceof BadRequest || error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Failed to send daily reminder');
    }
  }

  /**
   * Send achievement notification to specific user
   */
  static async sendAchievementNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const { title, description, icon } = req.body;
      
      if (isNaN(userId) || !title || !description || !icon) {
        throw new BadRequest('userId, title, description, and icon are required');
      }

      const success = await NotificationService.sendAchievementNotification(userId, {
        title,
        description,
        icon
      });
      
      if (success) {
        SuccessResponse.ok(res, null, 'Achievement notification sent successfully');
      } else {
        throw new NotFoundError('Failed to send achievement notification or user has disabled notifications');
      }
    } catch (error) {
      logger.error('Error sending achievement notification:', error);
      if (error instanceof BadRequest || error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Failed to send achievement notification');
    }
  }

  /**
   * Send system announcement to all users (admin only)
   */
  static async sendSystemAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, data } = req.body;
      
      if (!title || !message) {
        throw new BadRequest('title and message are required');
      }

      const result = await NotificationScheduler.sendSystemAnnouncement(title, message, data);
      
      SuccessResponse.ok(res, result, 'System announcement sent successfully');
    } catch (error) {
      logger.error('Error sending system announcement:', error);
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new InternalServerError('Failed to send system announcement');
    }
  }

  /**
   * Get notification scheduler status (admin only)
   */
  static async getSchedulerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = NotificationScheduler.getStatus();
      
      SuccessResponse.ok(res, status, 'Scheduler status retrieved successfully');
    } catch (error) {
      logger.error('Error getting scheduler status:', error);
      throw new InternalServerError('Failed to get scheduler status');
    }
  }
}

export default NotificationController;
