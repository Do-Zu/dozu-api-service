import { Request, Response } from 'express';
import feedbackService, { FeedbackData } from '@/services/feedback/feedback.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest, InternalServerError } from '@/core/error';
import logger from '@/utils/logger';
import { uploadFileServiceOnR2 } from '@/services/uploads/files/upload.file.R2.service';

/**
 * Controller class for Feedback functionality
 */
class FeedbackController {
    /**
     * Submit feedback from user
     */
    public submitFeedback = async (req: Request, res: Response): Promise<void> => {
        try {
            const { message } = req.body;
            const userId = req.currentUser?.userId;
            const userEmail = req.currentUser?.email;
            const userName = req.currentUser?.username || req.currentUser?.fullName;

            if (!message || !message.trim()) {
                throw new BadRequest('Feedback message is required');
            }

            let imageUrl: string | undefined;

            // Handle image upload if provided
            // Note: fileUploadSingleMiddleware uses field name 'file' and stores in memory
            if (req.file) {
                try {
                    // Upload file to R2 and get download URL
                    const uploadResult = await uploadFileServiceOnR2.uploadFileFromBuffer(req.file);
                    imageUrl = uploadResult.downloadUrl;
                    logger.info(`Feedback image uploaded to R2: ${uploadResult.fileKey}`);
                } catch (uploadError) {
                    logger.warn('Failed to upload feedback image to R2:', uploadError);
                    // Continue without image if upload fails
                }
            }

            const feedbackData: FeedbackData = {
                message: message.trim(),
                userId,
                userEmail,
                userName,
                imageUrl,
            };

            const success = await feedbackService.sendFeedback(feedbackData);

            if (success) {
                SuccessResponse.ok(
                    res,
                    { message: 'Feedback đã được gửi thành công. Cảm ơn bạn đã đóng góp!' },
                    'Feedback sent successfully'
                );
            } else {
                throw new InternalServerError('Failed to send feedback. Please try again later.');
            }
        } catch (error) {
            logger.error('Error submitting feedback:', error);
            if (error instanceof BadRequest) {
                throw error;
            }
            throw new InternalServerError('Failed to submit feedback');
        }
    };
}

export const feedbackController = new FeedbackController();
export default feedbackController;
