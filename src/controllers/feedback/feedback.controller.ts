import { Request, Response } from 'express';
import feedbackService, { FeedbackData } from '@/services/feedback/feedback.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest, InternalServerError } from '@/core/error';
import logger from '@/utils/logger';
import { uploadFileService } from '@/services/uploads/files/upload.file.service';

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
            // Note: fileUploadSingleMiddleware uses field name 'file'
            if (req.file) {
                try {
                    const uploadResult = await uploadFileService.processSingleFile(req.file);
                    // Get the file path or URL from the result
                    imageUrl = uploadResult.filePath || uploadResult.fileName;
                    // If using cloud storage, you might need to construct the full URL
                    // imageUrl = `${process.env.CLOUD_STORAGE_BASE_URL}/${uploadResult.filePath}`;
                } catch (uploadError) {
                    logger.warn('Failed to upload feedback image:', uploadError);
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
