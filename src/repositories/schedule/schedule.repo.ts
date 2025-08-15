// import logger from '@/utils/logger';

import db from '@/libs/drizzleClient.lib';
import { and, eq, lte, gte } from 'drizzle-orm';
import { itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { ItemTrackingWithTopic } from '@/services/schedule/types/schedule.index';

/**
 * Repository for Schedule data access operations
 */
class ScheduleRepository {
    private readonly LIMIT_ITEM_TRACKING = 400;

    /**
     * Retrieves a list of item tracking records for a user within a specified week.
     * This method fetches the item tracking data along with associated topic details.
     *
     * @param userId - The ID of the user whose item tracking records are to be fetched.
     * @param fromDate - The start date of the week in ISO format (YYYY-MM-DD).
     * @param toDate - The end date of the week in ISO format (YYYY-MM-DD).
     * @returns A promise that resolves to an array of ItemTrackingWithTopic objects.
     */
    async getListItemTrackingByUserIdInWeek(
        userId: number,
        fromDate: string,
        toDate: string
    ): Promise<ItemTrackingWithTopic[]> {
        const result = await db
            .select({
                itemId: itemSpacedRepetitionTrackingTable.itemId,
                userId: itemSpacedRepetitionTrackingTable.userId,
                topicId: itemSpacedRepetitionTrackingTable.topicId,
                type: itemSpacedRepetitionTrackingTable.type,
                createdAt: itemSpacedRepetitionTrackingTable.createdAt,
                repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
                easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
                reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
                lastReviewed: itemSpacedRepetitionTrackingTable.lastReviewed,
                nextReview: itemSpacedRepetitionTrackingTable.nextReview,
                status: itemSpacedRepetitionTrackingTable.status,
                topicTitle: topicsTable.name,
                topicDescription: topicsTable.description,
            })
            .from(itemSpacedRepetitionTrackingTable)
            .leftJoin(topicsTable, eq(itemSpacedRepetitionTrackingTable.topicId, topicsTable.topicId))
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    and(
                        gte(itemSpacedRepetitionTrackingTable.nextReview, fromDate),
                        lte(itemSpacedRepetitionTrackingTable.nextReview, toDate)
                    )
                )
            );

        return result;
    }
}

export const scheduleRepo = new ScheduleRepository();
