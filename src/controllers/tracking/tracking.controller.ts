import { Request, Response } from 'express';
import { trackingService } from '@/services/tracking/tracking.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';

/**
 * Controller class for Tracking functionality
 */
class TrackingController {
    /**
     * Handles the get tracking current learning progress topic
     * @param req - Express request object
     * @param res - Express response object
     */
    public async getCurrentLearningTopicProgressTracking(req: Request, res: Response): Promise<void> {
        const { userId } = req.currentUser;

        if (isNaN(userId) || userId <= 0) {
            throw new BadRequest('User ID is required');
        }

        const result = await trackingService.getCurrentLearningTopicProgressTracking({
            userId,
        });

        SuccessResponse.ok(res, result, 'Current learning topic progress tracking retrieved successfully');
    }
}

export const trackingController = new TrackingController();
