import db from '@/libs/drizzleClient.lib';
import { IItemStatus, itemSpacedRepetitionTrackingTable } from '@/models';
import { and, desc, eq, isNotNull } from 'drizzle-orm';

/**
 * Repository for Tracking data access operations
 */
class TrackingRepository {
    public async getCurrentLearningTopicProgressTracking(userId: number) {
        return this.getTrackingByEarliestReviewedTopic(userId);
    }

    public async getTopicLastUserReview(userId: number) {
        const [earliestTopicSubquery] = await db
            .select({
                topicId: itemSpacedRepetitionTrackingTable.topicId,
                type: itemSpacedRepetitionTrackingTable.type,
            })
            .from(itemSpacedRepetitionTrackingTable)
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    isNotNull(itemSpacedRepetitionTrackingTable.lastReviewed),
                    eq(itemSpacedRepetitionTrackingTable.type, 'flashcard')
                )
            )
            .orderBy(desc(itemSpacedRepetitionTrackingTable.lastReviewed))
            .limit(1);

        return earliestTopicSubquery;
    }

    private async getTrackingByEarliestReviewedTopic(userId: number) {
        const { topicId } = await this.getTopicLastUserReview(userId);

        const result: {
            topicId: number;
            type: 'flashcard' | 'question';
            repetitionNumber: number;
            easinessFactor: string;
            reviewInterval: number;
            lastReviewed: string | null;
            nextReview: string | null;
            status: IItemStatus;
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
            .where(eq(itemSpacedRepetitionTrackingTable.topicId, topicId));

        return result;
    }
}

export const trackingRepo = new TrackingRepository();
