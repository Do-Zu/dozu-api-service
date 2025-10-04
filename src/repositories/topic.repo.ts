import db, { Transaction } from '@/libs/drizzleClient.lib';
import { flashcardsTable, itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { ICreateTopicService, IUpdateTopicService } from '@/services/topic/topic.service';
import { ITopic } from '@/types/topic/topic.type';
import { and, eq, sql } from 'drizzle-orm';

export type ICreateTopicRepo = ICreateTopicService & { userId: number; classId?: number | null };
export type IUpdateTopicRepo = IUpdateTopicService;

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
                classId: topicsTable.classId,
            })
            .from(topicsTable)
            .where(eq(topicsTable.topicId, topicId));

        return topic;
    }

    public async getTopicsForUser(userId: number, dueDate: string): Promise<ITopic[]> {
        let topics: ITopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                userId: topicsTable.userId,
                name: topicsTable.name,
                description: topicsTable.description,
                imageUrl: topicsTable.imageUrl,
                createdAt: topicsTable.createdAt,
                flashcardCounts: {
                    total: sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL THEN 1 END) AS INT)`.as(
                        'total'
                    ),
                    dueToday:
                        sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.next_review <= ${dueDate} AND item_spaced_repetition_tracking.status = 'review' THEN 1 END) AS INT)`.as(
                            'dueToday'
                        ),
                    new: sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.status = 'new' THEN 1 END) AS INT)`.as(
                        'new'
                    ),
                    learning:
                        sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.next_review <= ${dueDate} AND item_spaced_repetition_tracking.status IN ('learning', 'relearning') THEN 1 END) AS INT)`.as(
                            `learning`
                        ),
                },
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
            imageUrl: topicsTable.imageUrl,
            createdAt: topicsTable.createdAt,
        });

        return result;
    }

    public async updateTopicById(topicId: number, topic: IUpdateTopicRepo): Promise<ITopic> {
        const [result] = await db.update(topicsTable).set(topic).where(eq(topicsTable.topicId, topicId)).returning({
            topicId: topicsTable.topicId,
            name: topicsTable.name,
            description: topicsTable.description,
            imageUrl: topicsTable.imageUrl,
            createdAt: topicsTable.createdAt,
        });
        return result;
    }

    public async deleteTopicById(topicId: number, tx?: Transaction): Promise<void> {
        const executor = tx ?? db;
        await executor.delete(topicsTable).where(eq(topicsTable.topicId, topicId));
    }

    public async getTopicsInClassForStudent(classId: number, userId: number, dueDate: string): Promise<ITopic[]> {
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
                    flashcardCounts: {
                        total: sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL THEN 1 END) AS INT)`.as(
                            'total'
                        ),
                        dueToday:
                            sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.next_review <= ${dueDate} AND item_spaced_repetition_tracking.status = 'review' THEN 1 END) AS INT)`.as(
                                'dueToday'
                            ),
                        new: sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.status = 'new' THEN 1 END) AS INT)`.as(
                            'new'
                        ),
                        learning:
                            sql<number>`CAST(COUNT(CASE WHEN flashcards.flashcard_id IS NOT NULL AND item_spaced_repetition_tracking.next_review <= ${dueDate} AND item_spaced_repetition_tracking.status IN ('learning', 'relearning') THEN 1 END) AS INT)`.as(
                                `learning`
                            ),
                    },
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
                // topic.flashcardsDueToday = result.flashcardsDueToday;
                topic.flashcardCounts = result.flashcardCounts;
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
