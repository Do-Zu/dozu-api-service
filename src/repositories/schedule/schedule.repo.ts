// import logger from '@/utils/logger';

import db from '@/libs/drizzleClient.lib';
import { and, eq, lte, gte } from 'drizzle-orm';
import { itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { ItemTrackingWithTopic } from '@/services/schedule/types/schedule.index';

/**
 * Repository for Schedule data access operations
 */
class ScheduleRepository {
  async getListItemTrackingByUserIdInWeek(
    userId: string,
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
      .innerJoin(topicsTable, eq(itemSpacedRepetitionTrackingTable.userId, topicsTable.userId))
      .where(
        and(
          eq(itemSpacedRepetitionTrackingTable.userId, parseInt(userId)),
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
