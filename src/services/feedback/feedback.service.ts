import feedbackRepository from '@/repositories/feedback/feedback.repo';
import NotificationService from '@/services/notification/notification.service';
import logger from '@/utils/logger';
import { getFeedbackEmailTemplate } from '@/services/feedback/feedback.email.template';
import {
    evaluateFeedback,
    type FeedbackEvaluationResult,
    type FeedbackInput,
} from '@/services/feedback/feedback.evaluator';

/**
 * Service class for Feedback functionality
 */
class FeedbackService {
    constructor() {}

    public async submitFeedback(input: FeedbackInput): Promise<{
        success: boolean;
        feedbackId: number;
        notified: boolean;
        score: number;
        reasons: string[];
    }> {
        const message = input.message?.trim() || '';
        if (!message) {
            // Controller should validate, but keep service safe
            throw new Error('Feedback message is required');
        }

        const evaluation = this.evaluateFeedback({ ...input, message });

        const saved = await this.saveFeedback({ ...input, message }, evaluation);

        const notified = await this.notifyIfNeeded({ ...input, message }, evaluation);

        return {
            success: true,
            feedbackId: saved.feedbackId,
            notified,
            score: evaluation.score,
            reasons: evaluation.reasons,
        };
    }

    private evaluateFeedback(input: FeedbackInput): FeedbackEvaluationResult {
        return evaluateFeedback(input);
    }

    private async saveFeedback(input: FeedbackInput, evaluation: FeedbackEvaluationResult): Promise<{ feedbackId: number }> {
        return feedbackRepository.create({
            message: input.message,
            userId: input.userId,
            userEmail: input.userEmail,
            userName: input.userName,
            imageUrl: input.imageUrl,
            score: evaluation.score,
            shouldSendEmail: evaluation.shouldSendEmail ? 1 : 0,
            reasons: JSON.stringify(evaluation.reasons),
        });
    }

    private async notifyIfNeeded(input: FeedbackInput, evaluation: FeedbackEvaluationResult): Promise<boolean> {
        if (!evaluation.shouldSendEmail) {
            logger.info('Feedback saved but not notified (filtered)', {
                score: evaluation.score,
                reasons: evaluation.reasons,
            });
            return false;
        }

        return this.sendFeedbackMail(input);
    }

    /**
     * Send feedback email to Dozu team
     */
    public async sendFeedbackMail(feedbackData: FeedbackInput): Promise<boolean> {
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

    /**
     * Backward compatibility: old API name.
     * Prefer using submitFeedback() which always saves to DB and filters spam.
     */
    public async sendFeedback(feedbackData: FeedbackInput): Promise<boolean> {
        const result = await this.submitFeedback(feedbackData);
        return result.success;
    }
}

export default new FeedbackService();
