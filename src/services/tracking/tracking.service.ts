import { trackingRepo } from '@/repositories/tracking/tracking.repo';
import { NotFoundError } from '@/core/error';
import topicRepo from '@/repositories/topic.repo';

/**
 * Service class for Tracking functionality
 */
class TrackingService {
    public async getCurrentLearningTopicProgressTracking(params: { userId: number }) {
        const { userId } = params;

        const result = await trackingRepo.getCurrentLearningTopicProgressTracking(userId);

        if (!result || result.length === 0) {
            throw new NotFoundError('No tracking current learning data found for the user');
        }

        const totalItems = result.length;

        const completedItems = result.filter(item => item.status !== 'new').length;

        const percentComplete = (completedItems / totalItems) * 100;

        const topicId = result[0].topicId;

        const topic = await topicRepo.getTopicById(topicId);

        return {
            topic,
            progress: {
                totalItems,
                completedItems,
                remain: totalItems - completedItems,
                percentComplete: Math.round(percentComplete),
                type: result[0].type,
            },
        };
    }
}

export const trackingService = new TrackingService();
