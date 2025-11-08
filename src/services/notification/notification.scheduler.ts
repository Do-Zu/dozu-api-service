import cron from 'node-cron';
import NotificationService from './notification.service';
import ProfileRepository from '@/repositories/profile/profile.repo';
import logger from '@/utils/logger';

export class NotificationScheduler {
    private static isInitialized = false;

    /**
     * Initialize all notification cron jobs
     */
    static init(): void {
        if (this.isInitialized) {
            logger.warn('NotificationScheduler already initialized');
            return;
        }
        //CURRENT: We test for the scheduler by running daily reminders
        this.scheduleDailyReminders();
        //TODO:
        this.scheduleWeeklyReports();
        this.scheduleReEngagementNotifications();

        this.isInitialized = true;
        logger.info('NotificationScheduler initialized successfully');
    }

    /**
     * Schedule daily learning reminders
     * Runs every day at 5:00 AM
     */
    private static scheduleDailyReminders(): void {
        cron.schedule(
            '0 5 * * *',
            async () => {
                logger.info('Running daily reminder notifications...');

                try {
                    const profileRepo = new ProfileRepository();
                    // Get all users who have daily reminders enabled
                    const users = await profileRepo.getUsersWithNotificationPreference('dailyReminders', true);

                    let sent = 0;
                    let failed = 0;

                    for (const user of users) {
                        try {
                            const success = await NotificationService.sendDailyReminder(user.userId);
                            if (success) {
                                sent++;
                                logger.debug(`Daily reminder sent to user ${user.username} (${user.userId})`);
                            } else {
                                failed++;
                            }
                        } catch (error) {
                            logger.error(
                                `Failed to send daily reminder to user ${user.username} (${user.userId}):`,
                                error
                            );
                            failed++;
                        }
                    }

                    logger.info(`Daily reminders completed: ${sent} sent, ${failed} failed`);
                } catch (error) {
                    logger.error('Error in daily reminder cron job:', error);
                }
            },
            {
                timezone: process.env.TIMEZONE || 'Asia/Ho_Chi_Minh',
            }
        );

        logger.info('Daily reminder notifications scheduled for 5:00 AM');
    }

    /**
     * Schedule weekly progress reports
     * Runs every Sunday at 2:00 AM
     */
    private static scheduleWeeklyReports(): void {
        cron.schedule(
            '0 2 * * 0',
            async () => {
                logger.info('Running weekly report notifications...');

                try {
                    const profileRepo = new ProfileRepository();
                    // Get all users who have weekly reports enabled
                    const users = await profileRepo.getUsersWithNotificationPreference('weeklyReports', true);

                    let sent = 0;
                    let failed = 0;

                    for (const user of users) {
                        try {
                            // TODO: Calculate actual user stats from database
                            const stats = {
                                studyHours: Math.floor(Math.random() * 20), // Mock data for now
                                topicsCompleted: Math.floor(Math.random() * 10),
                                achievementsEarned: Math.floor(Math.random() * 3),
                                streak: Math.floor(Math.random() * 7),
                            };

                            const success = await NotificationService.sendWeeklyReport(user.userId, stats);
                            if (success) {
                                sent++;
                                logger.debug(`Weekly report sent to user ${user.username} (${user.userId})`);
                            } else {
                                failed++;
                            }
                        } catch (error) {
                            logger.error(
                                `Failed to send weekly report to user ${user.username} (${user.userId}):`,
                                error
                            );
                            failed++;
                        }
                    }

                    logger.info(`Weekly reports completed: ${sent} sent, ${failed} failed`);
                } catch (error) {
                    logger.error('Error in weekly report cron job:', error);
                }
            },
            {
                timezone: process.env.TIMEZONE || 'Asia/Ho_Chi_Minh',
            }
        );

        logger.info('Weekly report notifications scheduled for Sunday 2:00 AM');
    }

    /**
     * Schedule re-engagement notifications for inactive users
     * Runs every day at 22:00 PM to check for inactive users
     */
    private static scheduleReEngagementNotifications(): void {
        cron.schedule(
            '0 22 * * *',
            async () => {
                logger.info('Running re-engagement notifications...');

                try {
                    const profileRepo = new ProfileRepository();
                    // Get users who haven't been active for 7 days
                    const inactiveUsers = await profileRepo.getInactiveUsers(7);

                    let sent = 0;
                    let failed = 0;

                    for (const user of inactiveUsers) {
                        try {
                            const success = await NotificationService.sendReEngagementNotification(user.userId);
                            if (success) {
                                sent++;
                                logger.debug(
                                    `Re-engagement notification sent to user ${user.username} (${user.userId})`
                                );
                            } else {
                                failed++;
                            }
                        } catch (error) {
                            logger.error(
                                `Failed to send re-engagement notification to user ${user.username} (${user.userId}):`,
                                error
                            );
                            failed++;
                        }
                    }

                    logger.info(`Re-engagement notifications completed: ${sent} sent, ${failed} failed`);
                } catch (error) {
                    logger.error('Error in re-engagement notification cron job:', error);
                }
            },
            {
                timezone: process.env.TIMEZONE || 'Asia/Ho_Chi_Minh',
            }
        );

        logger.info('Re-engagement notifications scheduled for 10:00 PM daily');
    }

    /**
     * Send achievement notification when triggered by app events
     */
    static async triggerAchievementNotification(
        userId: number,
        achievement: {
            title: string;
            description: string;
            icon: string;
        }
    ): Promise<boolean> {
        try {
            return await NotificationService.sendAchievementNotification(userId, achievement);
        } catch (error) {
            logger.error(`Failed to trigger achievement notification for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Send immediate notification to user
     */
    static async sendImmediateNotification(
        userId: number,
        type: 'reminder' | 'achievement' | 'progress' | 'system',
        title: string,
        message: string,
        data?: Record<string, unknown>
    ): Promise<boolean> {
        try {
            return await NotificationService.sendRealtimeNotification({
                userId,
                type,
                title,
                message,
                data: data || {},
                timestamp: new Date(),
                read: false,
            });
        } catch (error) {
            logger.error(`Failed to send immediate notification to user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Stop all scheduled jobs (useful for testing or shutdown)
     */
    static stopAll(): void {
        cron.getTasks().forEach(task => {
            task.stop();
        });

        this.isInitialized = false;
        logger.info('All notification cron jobs stopped');
    }

    /**
     * Send system-wide announcement to all users
     */
    static async sendSystemAnnouncement(
        title: string,
        message: string,
        data?: Record<string, unknown>
    ): Promise<{ sent: number; failed: number }> {
        try {
            const profileRepo = new ProfileRepository();
            const users = await profileRepo.getAllActiveUsers();

            let sent = 0;
            let failed = 0;

            for (const user of users) {
                try {
                    const success = await NotificationService.sendRealtimeNotification({
                        userId: user.userId,
                        type: 'system',
                        title,
                        message,
                        data: data || {},
                        timestamp: new Date(),
                        read: false,
                    });

                    if (success) {
                        sent++;
                    } else {
                        failed++;
                    }
                } catch (error) {
                    logger.error(
                        `Failed to send system announcement to user ${user.username} (${user.userId}):`,
                        error
                    );
                    failed++;
                }
            }

            logger.info(`System announcement completed: ${sent} sent, ${failed} failed`);
            return { sent, failed };
        } catch (error) {
            logger.error('Error sending system announcement:', error);
            return { sent: 0, failed: 0 };
        }
    }

    /**
     * Get status of scheduler
     */
    static getStatus(): {
        isInitialized: boolean;
        activeTasks: number;
    } {
        return {
            isInitialized: this.isInitialized,
            activeTasks: cron.getTasks().size,
        };
    }
}

export default NotificationScheduler;
