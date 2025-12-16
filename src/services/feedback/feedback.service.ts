import NotificationService from '@/services/notification/notification.service';
import logger from '@/utils/logger';
import { getFeedbackEmailTemplate } from '@/services/feedback/feedback.email.template';

export interface FeedbackData {
    message: string;
    userId?: number;
    userEmail?: string;
    userName?: string;
    imageUrl?: string;
}

/**
 * Service class for Feedback functionality
 */
class FeedbackService {
    constructor() {}

    /**
     * Send feedback email to Dozu team
     */
    public async sendFeedback(feedbackData: FeedbackData): Promise<boolean> {
        try {
            const recipientEmail = process.env.MAIL_USERNAME || 'dozu.learning@gmail.com';

            if (!feedbackData.message || !feedbackData.message.trim()) {
                logger.warn('Feedback message is empty');
                return false;
            }

            // Get user info if available
            const userInfo = feedbackData.userName
                ? `${feedbackData.userName}${feedbackData.userEmail ? ` (${feedbackData.userEmail})` : ''}`
                : feedbackData.userEmail || 'Anonymous User';

            // Create email template
            const emailTemplate = getFeedbackEmailTemplate({
                message: feedbackData.message,
                userInfo,
                userId: feedbackData.userId,
                imageUrl: feedbackData.imageUrl,
            });

            // Send email using NotificationService
            const emailSent = await NotificationService.sendEmail({
                to: recipientEmail,
                subject: `📝 Feedback từ người dùng - ${userInfo}`,
                html: emailTemplate.html,
                text: emailTemplate.text,
            });

            if (emailSent) {
                logger.info(`Feedback email sent successfully from user: ${userInfo}`);
                return true;
            } else {
                logger.error('Failed to send feedback email');
                return false;
            }
        } catch (error) {
            logger.error('Error sending feedback:', error);
            return false;
        }
    }
}

export default new FeedbackService();
