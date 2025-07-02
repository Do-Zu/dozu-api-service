import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import { eq, sql } from 'drizzle-orm';

export type ITopicForUser = ITopicBasic & { createdAt?: Date; flashcardsCount?: number; flashcardsDueToday?: number };
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

    public async handleGetAllTopicsForUser(userId: number, currentDate: string): Promise<ITopicsForUserReturned> {
        let topics: ITopicForUser[] = await db
            .select({
                topicId: topicsTable.topicId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,
                createdAt: topicsTable.createdAt,
                flashcardsCount:
                    // get number of flashcards in a topic, flashcards.flashcard_id IS NOT NULL because using below left join
                    sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL THEN 1 END) AS INT)`.as(
                        'flashcardsCount'
                    ),
                // get flashcards-due-today, next_review <= today and last_reviewed should not null (if it is, it should be flashcardsNew)
                flashcardsDueToday:
                    sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.next_review <= ${currentDate} AND item_spaced_repetition_tracking.last_reviewed IS NOT NULL THEN 1 END) AS INT)`.as(
                        'flashcardsDueToday'
                    ),
                // get number of new flashcards item_spaced_repetition_tracking.last_reviewed IS NULL because flashcards inserted have last_reviewed NULL
                flashcardsNew:
                    sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.last_reviewed IS NULL THEN 1 END) AS INT)`.as(
                        'flashcardsNew'
                    ),
            })
            .from(topicsTable)
            // some topics don't have a single flashcard, so using left join to get that topics
            .leftJoin(flashcardsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
            .leftJoin(
                itemSpacedRepetitionTrackingTable,
                eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId)
            )
            .where(eq(topicsTable.userId, userId))
            .groupBy(topicsTable.topicId);

        return topics;
    }

    public async handleInsertSingleTopicForUser(topic: ITopicAdded): Promise<ITopicForUser> {
        const result = await db.insert(topicsTable).values(topic).returning({
            topicId: topicsTable.topicId,
            name: topicsTable.name,
            description: topicsTable.description,
            createdAt: topicsTable.createdAt,
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

export default new TopicRepo();
