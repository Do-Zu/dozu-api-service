import topicRepo from '@/repositories/topic.repo';
import { trackingRepo } from '@/repositories/tracking/tracking.repo';
import { TIMEZONE } from '@/utils/date';
import { NotFoundError } from '@/core/error';
import { toZonedTime } from 'date-fns-tz';
import { isAfter } from 'date-fns';

/**
 * Service class for Tracking functionality
 */
class TrackingService {
    public async getCurrentLearningTopicProgressTracking(params: { userId: number; currentDate: string }) {
        const { userId, currentDate } = params;

        const result = await trackingRepo.getCurrentLearningTopicProgressTracking(userId);

        if (!result || result.length === 0) {
            throw new NotFoundError('No tracking current learning data found for the user');
        }

        const totalItems = result.length;

        const todayUTC = toZonedTime(currentDate, TIMEZONE.UTC);

        // Calculate completed items based on nextReview date
        // Compare with current date in UTC

        const listDueToday = result.filter(item => {
            if (!item.nextReview || !item.lastReviewed) return false;

            const nextReviewDate = toZonedTime(item.nextReview, TIMEZONE.UTC);

            return !isAfter(nextReviewDate, todayUTC);
        }).length;

        const listNew = result.filter(item => !item.lastReviewed).length;

        const completedItems = totalItems - (listDueToday + listNew);

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
