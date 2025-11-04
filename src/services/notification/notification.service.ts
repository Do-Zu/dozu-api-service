import nodemailer from 'nodemailer';
import { NotificationSettings } from '@/models/user.model';
import ProfileRepository from '@/repositories/profile/profile.repo';
import logger from '@/utils/logger';
import { NotificationWebSocketService } from '@/libs/websocket/notification.websocket';
import {
  getDailyReminderTemplate,
  getWeeklyReportTemplate,
  getAchievementTemplate,
  getReEngagementTemplate,
  getSystemAnnouncementTemplate,
} from './notification.email.templates';

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PushNotification {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface RealtimeNotification {
  userId: number;
  type: 'achievement' | 'reminder' | 'progress' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

export interface NotificationContext {
  userId: number;
  username: string;
  fullName: string | null;
  email: string;
  settings: NotificationSettings;
}

/**
 * Enhanced Notification Service for handling email, push, and realtime notifications
 * Updated for merged users table architecture
 */
export class NotificationService {
  private static profileRepo = new ProfileRepository();
  private static emailTransporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_APP_PASSWORD,
    },
  });

  // Store in-memory notifications (in production, use Redis or database)
  private static notifications: Map<number, RealtimeNotification[]> = new Map();

  /**
   * Initialize Firebase Admin SDK for FCM (implement when needed)
   */
  private static initializeFirebase(): void {
    // TODO: Implement Firebase Admin SDK initialization
    // const admin = require('firebase-admin');
    // const serviceAccount = require('path/to/serviceAccountKey.json');
    // admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount),
    // });
  }

  /**
   * Send email notification
   */
  static async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      if (!process.env.MAIL_USERNAME  || !process.env.MAIL_APP_PASSWORD) {
        logger.warn('SMTP credentials not configured, skipping email notification');
        return false;
      }

      const info = await this.emailTransporter.sendMail({
        from: `"Dozu Learning" <${process.env.MAIL_USERNAME}>`,
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
      });

      logger.info('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send realtime notification via WebSocket
   */
  static async sendRealtimeNotification(notification: RealtimeNotification): Promise<boolean> {
    try {
      // Store notification in memory FIRST (use Redis in production)
      // This ensures notification is saved even if WebSocket fails
      const userNotifications = this.notifications.get(notification.userId) || [];
      userNotifications.unshift(notification);
      this.notifications.set(notification.userId, userNotifications.slice(0, 50)); // Keep last 50 notifications

      // Try to send via WebSocket if user is connected (optional)
      // If user is not connected, notification is still saved and will be retrieved when they check
      const wsService = NotificationWebSocketService.getInstance();
      const wsSuccess = await wsService.sendToUser(notification.userId.toString(), 'notification', {
        id: Date.now().toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.timestamp,
        read: notification.read
      });

      if (wsSuccess) {
        logger.info(`Realtime notification sent via WebSocket to user ${notification.userId}:`, notification.title);
      } else {
        logger.info(`Notification saved for user ${notification.userId} (user not connected):`, notification.title);
      }

      // Always return true since notification is successfully saved
      // WebSocket delivery is just a bonus for real-time updates
      return true;
    } catch (error) {
      logger.error('Failed to send realtime notification:', error);
      return false;
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  static async sendFCMNotification(notification: PushNotification, fcmToken?: string): Promise<boolean> {
    try {
      // TODO: Implement FCM push notification
      // For now, simulate the process
      
      if (!fcmToken) {
        // In real implementation, get FCM token from user's device registration
        logger.warn(`No FCM token found for user ${notification.userId}`);
        return false;
      }

      // const admin = require('firebase-admin');
      // const message = {
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //   },
      //   data: notification.data,
      //   token: fcmToken
      // };
      
      // const response = await admin.messaging().send(message);
      // logger.info('FCM notification sent successfully:', response);
      
      logger.info('FCM notification would be sent:', notification);
      return true;
    } catch (error) {
      logger.error('Failed to send FCM notification:', error);
      return false;
    }
  }

  /**
   * Get user's unread notifications
   */
  static getUserNotifications(userId: number): RealtimeNotification[] {
    return this.notifications.get(userId) || [];
  }

  /**
   * Mark notification as read
   */
  static markNotificationAsRead(userId: number, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => 
      n.timestamp.getTime().toString() === notificationId
    );
    
    if (notification) {
      notification.read = true;
      return true;
    }
    
    return false;
  }

  /**
   * Clear all notifications for a user
   */
  static clearUserNotifications(userId: number): void {
    this.notifications.delete(userId);
  }

  /**
   * Get user notification context - Updated for merged users table
   */
  static async getUserNotificationContext(userId: number): Promise<NotificationContext | null> {
    try {
      // Use simplified getUserById since profile is merged into users table
      const user = await this.profileRepo.getUserById(userId);
      if (!user) {
        return null;
      }

      return {
        userId,
        username: user.username,
        fullName: user.fullName || null,
        email: user.email,
        settings: user.notificationSettings as NotificationSettings || {
          dailyReminders: true,
          weeklyReports: true,
          achievementNotifications: true,
          emailNotifications: true,
          pushNotifications: true,
        }
      };
    } catch (error) {
      logger.error('Failed to get user notification context:', error);
      return null;
    }
  }

  /**
   * Send daily learning reminder
   */
  static async sendDailyReminder(userId: number): Promise<boolean> {
    try {
      const context = await this.getUserNotificationContext(userId);
      if (!context || !context.settings.dailyReminders) {
        return false;
      }

      const template = getDailyReminderTemplate({
        fullName: context.fullName || context.username,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: '🎯 Your Daily Learning Reminder - Dozu',
        html: template.html,
        text: template.text,
      };

      const emailSent = context.settings.emailNotifications 
        ? await this.sendEmail(emailNotification)
        : false;

      const pushSent = context.settings.pushNotifications
        ? await this.sendFCMNotification({
            userId,
            title: '🎯 Daily Learning Reminder',
            body: 'Time for your daily learning session!',
            data: { type: 'daily_reminder' }
          })
        : false;

      // Send realtime notification
      const realtimeSent = await this.sendRealtimeNotification({
        userId,
        type: 'reminder',
        title: '🎯 Daily Learning Reminder',
        message: 'Time for your daily learning session!',
        data: { type: 'daily_reminder' },
        timestamp: new Date(),
        read: false
      });

      return emailSent || pushSent || realtimeSent;
    } catch (error) {
      logger.error('Failed to send daily reminder:', error);
      return false;
    }
  }

  /**
   * Send weekly progress report
   */
  static async sendWeeklyReport(userId: number, stats: {
    studyHours: number;
    topicsCompleted: number;
    achievementsEarned: number;
    streak: number;
  }): Promise<boolean> {
    try {
      const context = await this.getUserNotificationContext(userId);
      if (!context || !context.settings.weeklyReports) {
        return false;
      }

      const template = getWeeklyReportTemplate({
        fullName: context.fullName || context.username,
        studyHours: stats.studyHours,
        topicsCompleted: stats.topicsCompleted,
        achievementsEarned: stats.achievementsEarned,
        streak: stats.streak,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: '📊 Your Weekly Learning Report - Dozu',
        html: template.html,
        text: template.text,
      };

      const emailSent = context.settings.emailNotifications 
        ? await this.sendEmail(emailNotification)
        : false;

      // Send realtime notification too
      const realtimeSent = await this.sendRealtimeNotification({
        userId,
        type: 'progress',
        title: '📊 Weekly Report Ready',
        message: `You studied ${stats.studyHours} hours and completed ${stats.topicsCompleted} topics this week!`,
        data: { type: 'weekly_report', stats },
        timestamp: new Date(),
        read: false
      });

      return emailSent || realtimeSent;
    } catch (error) {
      logger.error('Failed to send weekly report:', error);
      return false;
    }
  }

  /**
   * Send achievement notification
   */
  static async sendAchievementNotification(userId: number, achievement: {
    title: string;
    description: string;
    icon: string;
  }): Promise<boolean> {
    try {
      const context = await this.getUserNotificationContext(userId);
      if (!context || !context.settings.achievementNotifications) {
        return false;
      }

      const template = getAchievementTemplate({
        fullName: context.fullName || context.username,
        achievementTitle: achievement.title,
        achievementDescription: achievement.description,
        achievementIcon: achievement.icon,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: `🏆 New Achievement Unlocked - ${achievement.title}`,
        html: template.html,
        text: template.text,
      };

      const emailSent = context.settings.emailNotifications 
        ? await this.sendEmail(emailNotification)
        : false;

      const pushSent = context.settings.pushNotifications
        ? await this.sendFCMNotification({
            userId,
            title: `🏆 Achievement Unlocked!`,
            body: `${achievement.title} - ${achievement.description}`,
            data: { type: 'achievement', achievementTitle: achievement.title }
          })
        : false;

      // Send realtime notification
      const realtimeSent = await this.sendRealtimeNotification({
        userId,
        type: 'achievement',
        title: `🏆 ${achievement.title}`,
        message: achievement.description,
        data: { 
          type: 'achievement', 
          achievementTitle: achievement.title,
          icon: achievement.icon
        },
        timestamp: new Date(),
        read: false
      });

      return emailSent || pushSent || realtimeSent;
    } catch (error) {
      logger.error('Failed to send achievement notification:', error);
      return false;
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  static async sendBulkNotifications(
    userIds: number[],
    notification: {
      subject: string;
      html: string;
      text?: string;
    }
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const context = await this.getUserNotificationContext(userId);
        if (!context || !context.settings.emailNotifications) {
          failed++;
          continue;
        }

        const success = await this.sendEmail({
          to: context.email,
          subject: notification.subject,
          html: notification.html,
          text: notification.text
        });

        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send system announcement to all users
   */
  static async sendSystemAnnouncement(announcement: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }): Promise<{ sent: number; failed: number }> {
    try {
      // Get all active users
      const activeUsers = await this.profileRepo.getAllActiveUsers();
      
      const template = getSystemAnnouncementTemplate({
        title: announcement.title,
        message: announcement.message,
      });

      const notification = {
        subject: `📢 ${announcement.title} - Dozu`,
        html: template.html,
        text: template.text,
      };

      // Send bulk email notifications
      const bulkResult = await this.sendBulkNotifications(
        activeUsers.map(user => user.userId),
        notification
      );

      // Send realtime notifications to all users
      for (const user of activeUsers) {
        await this.sendRealtimeNotification({
          userId: user.userId,
          type: 'system',
          title: announcement.title,
          message: announcement.message,
          data: { 
            type: 'system_announcement',
            priority: announcement.priority
          },
          timestamp: new Date(),
          read: false
        });
      }

      logger.info(`System announcement sent: ${bulkResult.sent} successful, ${bulkResult.failed} failed`);
      return bulkResult;
    } catch (error) {
      logger.error('Failed to send system announcement:', error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send re-engagement notification to inactive users
   */
  static async sendReEngagementNotification(userId: number): Promise<boolean> {
    try {
      const context = await this.getUserNotificationContext(userId);
      if (!context || !context.settings.emailNotifications) {
        return false;
      }

      const template = getReEngagementTemplate({
        fullName: context.fullName || context.username,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: `We miss you! 🎓 Come back to Dozu`,
        html: template.html,
        text: template.text,
      };

      const emailSent = await this.sendEmail(emailNotification);

      // Send realtime notification too
      const realtimeSent = await this.sendRealtimeNotification({
        userId,
        type: 'system',
        title: '🎓 We miss you!',
        message: 'Come back and continue your learning journey on Dozu',
        data: { type: 're_engagement' },
        timestamp: new Date(),
        read: false
      });

      return emailSent || realtimeSent;
    } catch (error) {
      logger.error('Failed to send re-engagement notification:', error);
      return false;
    }
  }

  /**
   * Get notification statistics
   */
  static getNotificationStats(): {
    totalNotificationsStored: number;
    usersWithNotifications: number;
    averageNotificationsPerUser: number;
  } {
    const totalNotifications = Array.from(this.notifications.values())
      .reduce((sum, userNotifications) => sum + userNotifications.length, 0);
    
    const usersWithNotifications = this.notifications.size;
    const averageNotificationsPerUser = usersWithNotifications > 0 
      ? Math.round(totalNotifications / usersWithNotifications) 
      : 0;

    return {
      totalNotificationsStored: totalNotifications,
      usersWithNotifications,
      averageNotificationsPerUser
    };
  }
}

export default NotificationService;
