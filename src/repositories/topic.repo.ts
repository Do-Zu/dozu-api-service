import db from '@/libs/drizzleClient.lib';
import { topicsTable } from '@/models';
import { eq } from 'drizzle-orm';

const handleIsExistedTopic = async(topicId: any) => {
    const topic = await db.query.topicsTable.findFirst({ 
        where: eq(topicsTable.topicId, topicId), // condition
        columns: { // select column nào
            topicId: true
        }
    })
    return topic;
}

const topicRepo = { handleIsExistedTopic }

export default topicRepo;