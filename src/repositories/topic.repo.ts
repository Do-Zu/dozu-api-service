import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import { format } from 'date-fns';
import { count, eq, sql } from 'drizzle-orm';

export type ITopicForUser = ITopicBasic & { flashcardsCount?: number, flashcardsDueToday?: number };
export type ITopicsForUserReturned = ITopicForUser[];

class TopicRepo {
    public async handleGetSingleTopic(topicId: number): Promise<ITopicBasic | undefined> {
        const topic = await db.query.topicsTable.findFirst({
            where: eq(topicsTable.topicId, topicId),
            columns: {
                topicId: true,
                name: true,
                description: true,
            },
        });
        return topic;
    }

    public async handleGetAllTopicsForUser(userId: number): Promise<ITopicsForUserReturned> {
        const today = format(new Date(), 'yyyy-MM-dd');
        let topics: ITopicForUser[] = await db
            .select({
                topicId: topicsTable.topicId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,      
                flashcardsCount: count(),     
                flashcardsDueToday: sql<number>`CAST(COUNT(CASE WHEN item_spaced_repetition_tracking.next_review <= ${today} THEN 1 END) AS INT)`.as('flashcardsDueToday')
            })
            .from(topicsTable)
            .innerJoin(flashcardsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
            .innerJoin(itemSpacedRepetitionTrackingTable, eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId))
            .where(eq(topicsTable.userId, userId))
            .groupBy(topicsTable.topicId)

        return topics;
    }

    public async handleInsertSingleTopicForUser(topic: ITopicAdded): Promise<ITopicForUser> {
        const result = await db.insert(topicsTable).values(topic).returning({
            topicId: topicsTable.topicId,
            name: topicsTable.name,
            description: topicsTable.description,
        });

        let ret = result[0] as ITopicForUser;
        return ret;
    }

    public async handleUpdateSingleTopic(topicId: number, topic: ITopicUpdated): Promise<ITopicForUser> {
        const [ret] = await db.update(topicsTable).set(topic).where(eq(topicsTable.topicId, topicId)).returning({
            topicId: topicsTable.topicId,
            name: topicsTable.name,
            description: topicsTable.description,
        });
        return ret;
    }

    public async handleDeleteSingleTopic(topicId: number): Promise<void> {
        await db.delete(topicsTable).where(eq(topicsTable.topicId, topicId));
    }
}

export default TopicRepo;
