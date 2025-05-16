import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, topicsTable } from '@/models';
import { IBasicTopic, ITopic } from '@/types/topic/topic.type';
import { count, eq } from 'drizzle-orm';

class TopicRepo {
    public async handleGetSingleTopic(topicId: number) : Promise<Pick<ITopic, 'topicId' | 'name' | 'description'> | undefined> {
        const topic = await db.query.topicsTable.findFirst({ 
            where: eq(topicsTable.topicId, topicId), 
            columns: {
                topicId: true,
                name: true,
                description: true
            }
        })
        return topic;
    }

    public async handleGetAllTopicsForUser(userId: number) : Promise<IBasicTopic[]> {
        let topics : IBasicTopic[] = await db
            .select({
                topicId: topicsTable.topicId,
                name: topicsTable.name,
                description: topicsTable.description
            })
            .from(topicsTable)
            // .innerJoin(flashcardsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
            .where(eq(topicsTable.userId, userId))

        for(let i = 0; i < topics.length; ++i) {
            let topic = topics[i];
            const result = await db
                .select({
                    flashcardsCount: count()
                })
                .from(topicsTable)
                .innerJoin(flashcardsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
                .where(eq(topicsTable.topicId, topic.topicId))

            const { flashcardsCount } : { flashcardsCount: number } = result[0];

            topic['flashcardsCount'] = flashcardsCount;
            topics[i] = topic; 
        }

        return topics;
    }

    public async handleInsertSingleTopicForUser(topic: Pick<ITopic, 'userId' | 'name' | 'description'>) : Promise<Pick<ITopic, 'topicId' | 'name' | 'description'>> {
        const topicsAdded = await db
            .insert(topicsTable)
            .values(topic)
            .returning({
                topicId: topicsTable.topicId,
                name: topicsTable.name,
                description: topicsTable.description
            });
        return topicsAdded[0];
    }

    public async handleUpdateSingleTopic(topicId: number, topic: Pick<ITopic, 'name' | 'description'>) : Promise<Pick<ITopic, 'topicId' | 'name' | 'description'>> {
        const topicsUpdated = await db
            .update(topicsTable)
            .set(topic)
            .where(eq(topicsTable.topicId, topicId))
            .returning({
                topicId: topicsTable.topicId,
                name: topicsTable.name,
                description: topicsTable.description,
            })
        return topicsUpdated[0];
    }

    public async handleDeleteSingleTopic(topicId: number) : Promise<void> {
        await db
            .delete(topicsTable)
            .where(eq(topicsTable.topicId, topicId));
            // .returning({
            //     topicId: topicsTable.topicId
            // })
    }
}

export default TopicRepo;