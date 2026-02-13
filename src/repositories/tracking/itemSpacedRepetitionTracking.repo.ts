import db, { Transaction } from '@/libs/drizzleClient.lib';
import { IItemType, itemSpacedRepetitionTrackingTable } from '@/models';
import { ICreateTrackingRecord } from '@/types/tracking/itemSpacedRepetitionTracking.type';
import { and, eq, inArray } from 'drizzle-orm';

class ItemSpacedRepetitionTrackingRepo {
    public async initializeTrackingRecords(data: ICreateTrackingRecord[], tx?: Transaction): Promise<void> {
        if (data.length === 0) {
            return;
        }
        const executor = tx ?? db;
        await executor.insert(itemSpacedRepetitionTrackingTable).values(data);
    }

    public async getTrackingRecordsByUserAndTopicId(
        { userId, topicId, type }: { userId: number; topicId: number; type?: IItemType },
        tx?: Transaction
    ) {
        const executor = tx ?? db;
        const result = await executor
            .select()
            .from(itemSpacedRepetitionTrackingTable)
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    eq(itemSpacedRepetitionTrackingTable.topicId, topicId),
                    ...(type ? [eq(itemSpacedRepetitionTrackingTable.type, type)] : [])
                )
            );
        return result;
    }

    public async deleteTrackingRecordsByTopicId(topicId: number, tx?: Transaction) {
        const executor = tx ?? db;
        await executor
            .delete(itemSpacedRepetitionTrackingTable)
            .where(eq(itemSpacedRepetitionTrackingTable.topicId, topicId));
    }

    public async deleteTrackingRecordsByTopicsAndUser(
        { topicIds, userId }: { topicIds: number[]; userId: number },
        tx?: Transaction
    ) {
        if (topicIds.length === 0) return;
        const executor = tx ?? db;
        await executor
            .delete(itemSpacedRepetitionTrackingTable)
            .where(
                and(
                    inArray(itemSpacedRepetitionTrackingTable.topicId, topicIds),
                    eq(itemSpacedRepetitionTrackingTable.userId, userId)
                )
            );
    }
}

export default new ItemSpacedRepetitionTrackingRepo();