import nodemailer from 'nodemailer';
import { NotificationSettings } from '@/models/profile/profile.model';
import ProfileRepository from '@/repositories/profile/profile.repo';
import logger from '@/utils/logger';
import { WebSocketService } from '@/libs/websocket/socket.io';

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
  email: string;
  settings: NotificationSettings;
}

/**
 * Enhanced Notification Service for handling email, push, and realtime notifications
 */
export class NotificationService {
  private static profileRepo = new ProfileRepository();
  private static emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
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
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('SMTP credentials not configured, skipping email notification');
        return false;
      }

      const info = await this.emailTransporter.sendMail({
        from: `"Dozu Learning" <${process.env.SMTP_USER}>`,
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
      const wsService = WebSocketService.getInstance();
      
      // Store notification in memory (use Redis in production)
      const userNotifications = this.notifications.get(notification.userId) || [];
      userNotifications.unshift(notification);
      this.notifications.set(notification.userId, userNotifications.slice(0, 50)); // Keep last 50 notifications

      // Send via WebSocket if user is connected
      const success = await wsService.sendToUser(notification.userId.toString(), 'notification', {
        id: Date.now().toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.timestamp,
        read: notification.read
      });

      logger.info(`Realtime notification sent to user ${notification.userId}:`, notification.title);
      return success;
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
   * Get user notification context
   */
  static async getUserNotificationContext(userId: number): Promise<NotificationContext | null> {
    try {
      const profile = await this.profileRepo.getCompleteProfileByUserId(userId);
      if (!profile) {
        return null;
      }

      return {
        userId,
        username: profile.user.username,
        email: profile.user.email,
        settings: profile.notificationSettings as NotificationSettings
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

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: '🎯 Your Daily Learning Reminder - Dozu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Hi ${context.username}! 👋</h2>
            <p>Time for your daily learning session!</p>
            <p>Don't break your learning streak - even 10 minutes of study can make a difference.</p>
            <a href="${process.env.FRONTEND_URL}/topics" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Start Learning
            </a>
            <p style="color: #6b7280; font-size: 14px;">
              You can update your notification preferences in your profile settings.
            </p>
          </div>
        `,
        text: `Hi ${context.username}! Time for your daily learning session. Visit ${process.env.FRONTEND_URL}/topics to start learning.`
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

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: '📊 Your Weekly Learning Report - Dozu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Weekly Report for ${context.username} 📊</h2>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>This Week's Achievements</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;">⏰ Study Time: <strong>${stats.studyHours} hours</strong></li>
                <li style="margin: 10px 0;">📚 Topics Completed: <strong>${stats.topicsCompleted}</strong></li>
                <li style="margin: 10px 0;">🏆 Achievements Earned: <strong>${stats.achievementsEarned}</strong></li>
                <li style="margin: 10px 0;">🔥 Current Streak: <strong>${stats.streak} days</strong></li>
              </ul>
            </div>
            <p>Keep up the great work! Continue your learning journey.</p>
            <a href="${process.env.FRONTEND_URL}/progress" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              View Full Progress
            </a>
          </div>
        `,
        text: `Weekly Report: ${stats.studyHours}h study time, ${stats.topicsCompleted} topics completed, ${stats.achievementsEarned} achievements, ${stats.streak} day streak.`
      };

      return context.settings.emailNotifications 
        ? await this.sendEmail(emailNotification)
        : false;
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

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: `🏆 New Achievement Unlocked - ${achievement.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Congratulations ${context.username}! 🎉</h2>
            <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">${achievement.icon}</div>
              <h3 style="color: #92400e; margin: 0;">${achievement.title}</h3>
              <p style="color: #92400e; margin: 10px 0 0 0;">${achievement.description}</p>
            </div>
            <p>You've unlocked a new achievement! Keep up the excellent work.</p>
            <a href="${process.env.FRONTEND_URL}/progress" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              View All Achievements
            </a>
          </div>
        `,
        text: `Congratulations! You've unlocked: ${achievement.title} - ${achievement.description}`
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
   * Send re-engagement notification to inactive users
   */
  static async sendReEngagementNotification(userId: number): Promise<boolean> {
    try {
      const context = await this.getUserNotificationContext(userId);
      if (!context || !context.settings.emailNotifications) {
        return false;
      }

      const emailNotification: EmailNotification = {
        to: context.email,
        subject: `We miss you! 🎓 Come back to Dozu`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Hi ${context.username}! 👋</h2>
            <p>We noticed you haven't been active on Dozu lately. We miss you!</p>
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">What's waiting for you:</h3>
              <ul style="color: #1e40af;">
                <li>📚 New learning materials</li>
                <li>🎯 Updated study goals</li>
                <li>🏆 New achievements to unlock</li>
                <li>📊 Track your progress</li>
              </ul>
            </div>
            <p>Don't let your learning streak break! Come back and continue your journey.</p>
            <a href="${process.env.FRONTEND_URL}/topics" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Continue Learning
            </a>
            <p style="color: #6b7280; font-size: 14px;">
              If you no longer wish to receive these emails, you can update your preferences in your profile settings.
            </p>
          </div>
        `,
        text: `Hi ${context.username}! We miss you on Dozu. Come back and continue your learning journey: ${process.env.FRONTEND_URL}/topics`
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
}

export default NotificationService;
