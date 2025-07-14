import db from '@/libs/drizzleClient.lib';
import { itemSpacedRepetitionTrackingTable } from '@/models';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';

/**
 * Repository for Tracking data access operations
 */
class TrackingRepository {
    public async getCurrentLearningTopicProgressTracking(userId: number) {
        return this.getTrackingByEarliestReviewedTopic(userId);
    }

    private async getTrackingByEarliestReviewedTopic(userId: number) {
        const earliestTopicSubquery = db
            .select({ topicId: itemSpacedRepetitionTrackingTable.topicId })
            .from(itemSpacedRepetitionTrackingTable)
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    isNotNull(itemSpacedRepetitionTrackingTable.lastReviewed),
                    eq(itemSpacedRepetitionTrackingTable.type, 'flashcard')
                )
            )
            .orderBy(asc(itemSpacedRepetitionTrackingTable.lastReviewed))
            .limit(1);

        const result: {
            topicId: number;
            type: 'flashcard' | 'question';
            repetitionNumber: number;
            easinessFactor: string;
            reviewInterval: number;
            lastReviewed: string | null;
            nextReview: string | null;
            status: 'new' | 'learning' | 'review';
        }[] = await db
            .select({
                topicId: itemSpacedRepetitionTrackingTable.topicId,
                type: itemSpacedRepetitionTrackingTable.type,
                repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
                easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
                reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
                lastReviewed: itemSpacedRepetitionTrackingTable.lastReviewed,
                nextReview: itemSpacedRepetitionTrackingTable.nextReview,
                status: itemSpacedRepetitionTrackingTable.status,
            })
            .from(itemSpacedRepetitionTrackingTable)
            .where(inArray(itemSpacedRepetitionTrackingTable.topicId, earliestTopicSubquery));

        return result;
    }
}

export const trackingRepo = new TrackingRepository();
