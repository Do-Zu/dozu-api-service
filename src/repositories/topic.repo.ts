import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { ITopic } from '@/types/topic/topic.type';
import { and, eq, sql } from 'drizzle-orm';

export type ICreateTopicRepo = Pick<ITopic, 'name' | 'description'> & { userId: number };
export type IUpdateTopicRepo = Pick<ITopic, 'name' | 'description'>;

class TopicRepo {
    public async getTopicById(topicId: number): Promise<ITopic | undefined> {
        let [topic]: ITopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                userId: topicsTable.userId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,
                createdAt: topicsTable.createdAt,
                classId: topicsTable.classId
            })
            .from(topicsTable)
            .where(eq(topicsTable.topicId, topicId));

        return topic;
    }

    public async getTopicsForUser(userId: number, currentDate: string): Promise<ITopic[]> {
        let topics: ITopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                userId: topicsTable.userId,
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

    public async createTopicForUser(topic: ICreateTopicRepo): Promise<ITopic> {
        const [result] = await db.insert(topicsTable).values(topic).returning({
            topicId: topicsTable.topicId,
            name: topicsTable.name,
            description: topicsTable.description,
            createdAt: topicsTable.createdAt,
        });

        return result;
    }

    public async updateTopicById(topicId: number, topic: IUpdateTopicRepo): Promise<ITopic> {
        const [result] = await db.update(topicsTable).set(topic).where(eq(topicsTable.topicId, topicId)).returning({
            topicId: topicsTable.topicId,
            name: topicsTable.name,
            description: topicsTable.description,
            createdAt: topicsTable.createdAt,
        });
        return result;
    }

    public async deleteTopicById(topicId: number): Promise<void> {
        await db.delete(topicsTable).where(eq(topicsTable.topicId, topicId));
    }

    public async getTopicsForClass(classId: number, userId: number, currentDate: string): Promise<ITopic[]> {
        let topics: ITopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                userId: topicsTable.userId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,
                createdAt: topicsTable.createdAt,
                // get flashcards-due-today, next_review <= today and last_reviewed should not null (if it is, it should be flashcardsNew)
                flashcardsDueToday:
                    sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.next_review <= ${currentDate} AND item_spaced_repetition_tracking.last_reviewed IS NOT NULL THEN 1 END) AS INT)`.as(
                        'flashcardsDueToday'
                    ),
            })
            .from(topicsTable)
            // some topics don't have a single flashcard, so using left join to get that topics
            .leftJoin(flashcardsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
            .leftJoin(
                itemSpacedRepetitionTrackingTable,
                eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId)
            )
            .where(and(eq(topicsTable.classId, classId), eq(itemSpacedRepetitionTrackingTable.userId, userId)))
            .groupBy(topicsTable.topicId);

        return topics;
    }

    public async getTopicsInClassForStudent(classId: number, userId: number, currentDate: string): Promise<ITopic[]> {
        let topics: ITopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                userId: topicsTable.userId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,
                createdAt: topicsTable.createdAt,
            })
            .from(topicsTable)
            .where(eq(topicsTable.classId, classId));

        for (let i = 0; i < topics.length; ++i) {
            let topic = topics[i];

            const [result] = await db
                .select({
                    topicId: flashcardsTable.topicId,
                    flashcardsDueToday:
                        sql<number>`CAST(COUNT(CASE WHEN item_spaced_repetition_tracking.next_review <= ${currentDate} THEN 1 END) AS INT)`.as(
                            'flashcardsDueToday'
                        ),
                    hasProgress: sql<boolean>`BOOL_OR(item_spaced_repetition_tracking.item_id IS NOT NULL)`.as(
                        'hasProgress'
                    ),
                })
                .from(flashcardsTable)
                .innerJoin(
                    itemSpacedRepetitionTrackingTable,
                    and(
                        eq(itemSpacedRepetitionTrackingTable.userId, userId),
                        eq(flashcardsTable.flashcardId, itemSpacedRepetitionTrackingTable.itemId),
                        eq(itemSpacedRepetitionTrackingTable.type, 'flashcard')
                    )
                )
                .where(eq(flashcardsTable.topicId, topic.topicId))
                .groupBy(flashcardsTable.topicId);

            if (result) {
                topic.hasProgress = true;
                topic.flashcardsDueToday = result.flashcardsDueToday;
            } else {
                topic.hasProgress = false;
            }
        }

        return topics;
    }

    public async getTopicsInClassForTeacher(classId: number): Promise<ITopic[]> {
        let topics: ITopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                userId: topicsTable.userId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,
                createdAt: topicsTable.createdAt,
            })
            .from(topicsTable)
            .where(eq(topicsTable.classId, classId))
            .groupBy(topicsTable.topicId);

        return topics;
    }
}

export default new TopicRepo();
