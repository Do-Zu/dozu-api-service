import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, topicsTable } from '@/models';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import { count, eq } from 'drizzle-orm';

export type ITopicForUser = ITopicBasic & { flashcardsCount?: number };
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
        let topics: ITopicForUser[] = await db
            .select({
                topicId: topicsTable.topicId,
                name: topicsTable.name,
                description: topicsTable.description,
            })
            .from(topicsTable)
            .where(eq(topicsTable.userId, userId));

        for (let i = 0; i < topics.length; ++i) {
            let topic = topics[i] as ITopicForUser;
            const result = await db
                .select({
                    flashcardsCount: count(),
                })
                .from(topicsTable)
                .innerJoin(flashcardsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
                .where(eq(topicsTable.topicId, topic.topicId));

            const { flashcardsCount }: { flashcardsCount: number } = result[0];

            topic['flashcardsCount'] = flashcardsCount;
            topics[i] = topic;
        }

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

export const topicRepo = new TopicRepo();
