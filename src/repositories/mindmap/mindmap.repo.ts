import db, { Transaction } from '@/libs/drizzleClient.lib';
import { flashcardsTable, itemSpacedRepetitionTrackingTable, usersTable } from '@/models';
import { InsertMindmap, mindmapsTable, SelectMindmap } from '@/models/mindmap/mindmap.model';
import { NodeStat } from '@/types/mindmap/nodeStat.type';
import { and, eq, sql, inArray } from 'drizzle-orm';

export const insertMindmap = async (inputMindmap: InsertMindmap): Promise<SelectMindmap> => {
    const [insertedMindmap] = await db.insert(mindmapsTable).values(inputMindmap).returning();
    return insertedMindmap;
};

export const getMindmapByTopicId = async (topicId: number): Promise<SelectMindmap | undefined> => {
    const [result] = await db.select().from(mindmapsTable).where(eq(mindmapsTable.topicId, topicId));
    return result;
};

export const getNodesStats = async ({
    nodeIds,
    userId,
}: {
    nodeIds: string[];
    userId: number;
}): Promise<NodeStat[]> => {
    const result = await db
        .select({
            nodeId: flashcardsTable.nodeId,
            total: sql<number>`COUNT(*)`,
            mature: sql<number>`COUNT(*) FILTER (WHERE ${itemSpacedRepetitionTrackingTable.reviewInterval} >= 21)`,
        })
        .from(itemSpacedRepetitionTrackingTable)
        .innerJoin(
            flashcardsTable,
            eq(flashcardsTable.flashcardId, itemSpacedRepetitionTrackingTable.itemId) // join condition
        )
        .where(
            and(
                eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
                eq(itemSpacedRepetitionTrackingTable.userId, userId),
                inArray(flashcardsTable.nodeId, nodeIds)
            )
        )
        .groupBy(flashcardsTable.nodeId, itemSpacedRepetitionTrackingTable.userId); // <-- needed when using COUNT

    return result;
};

export const getAllMindmapNodesByTopicId = async (topicId: number) => {
    const [result] = await db.select().from(mindmapsTable).where(eq(mindmapsTable.topicId, topicId));
    return result?.mindmapData?.nodes;
};

export const updateMindmapByTopicId = async (topicId: number, inputMindmap: InsertMindmap): Promise<SelectMindmap> => {
    const [result] = await db
        .update(mindmapsTable)
        .set(inputMindmap)
        .where(eq(mindmapsTable.topicId, topicId))
        .returning();
    return result;
};

export const getFlashcardsByNodeId = async (nodeId: string) => {
    const result = await db.select().from(flashcardsTable).where(eq(flashcardsTable.nodeId, nodeId));
    return result;
};

export const getFlashcardProgress = async (userId: number, flashcardIds: number[]) => {
    if (flashcardIds.length === 0) {
        return { total: 0, mature: 0 };
    } //Short-circuit when flashcardIds is empty.
    const result = await db
        .select({
            total: sql<number>`COUNT(*)`,
            mature: sql<number>`COUNT(*) FILTER (WHERE ${itemSpacedRepetitionTrackingTable.reviewInterval} >= 21)`,
            // learning: sql<number>`COUNT(*) FILTER (WHERE ${itemSpacedRepetitionTrackingTable.status} = 'learning')`,
            // review: sql<number>`COUNT(*) FILTER (WHERE ${itemSpacedRepetitionTrackingTable.status} = 'review')`,
        })
        .from(itemSpacedRepetitionTrackingTable)
        .where(
            and(
                eq(itemSpacedRepetitionTrackingTable.userId, userId),
                eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
                inArray(itemSpacedRepetitionTrackingTable.itemId, flashcardIds)
            )
        );

    return result[0];
};
export const getFlashcardClassProgress = async (userIds: number[], flashcardIds: number[]) => {
    if (userIds.length === 0 || flashcardIds.length === 0) {
        return [];
    }
    const result = await db
        .select({
            userId: itemSpacedRepetitionTrackingTable.userId,
            userName: usersTable.fullName,
            total: sql<number>`COUNT(*)`,
            mature: sql<number>`COUNT(*) FILTER (WHERE ${itemSpacedRepetitionTrackingTable.reviewInterval} >= 21)`,
        })
        .from(itemSpacedRepetitionTrackingTable)
        .innerJoin(
            usersTable,
            eq(usersTable.userId, itemSpacedRepetitionTrackingTable.userId) // join condition
        )
        .where(
            and(
                eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
                inArray(itemSpacedRepetitionTrackingTable.userId, userIds),
                inArray(itemSpacedRepetitionTrackingTable.itemId, flashcardIds)
            )
        )
        .groupBy(itemSpacedRepetitionTrackingTable.userId, usersTable.fullName); // <-- needed when using COUNT

    return result;
};



export const deleteMindmapByTopicId = async (topicId: number, tx?: Transaction) => {
    const executor = tx ?? db;
    await executor.delete(mindmapsTable).where(eq(mindmapsTable.topicId, topicId));
};
