import TopicRepo, { ITopicForUser, ITopicsForUserReturned } from '@/repositories/topic.repo';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';

const topicRepo = new TopicRepo();

class TopicService {
    public async handleIsExistedTopic(topicId: number): Promise<boolean> {
        const topic = await topicRepo.handleGetSingleTopic(topicId);
        return topic ? true : false;
    }

    public async handleGetSingleTopic(topicId: number): Promise<ITopicBasic | undefined> {
        const topic = await topicRepo.handleGetSingleTopic(topicId);
        return topic;
    }

    public async handleGetAllTopicsForUser(userId: number): Promise<ITopicsForUserReturned> {
        const topics = await topicRepo.handleGetAllTopicsForUser(userId);
        return topics;
    }

    public async handleInsertSingleTopicForUser(topic: ITopicAdded): Promise<ITopicForUser> {
        const ret = await topicRepo.handleInsertSingleTopicForUser(topic);
        return ret;
    }

    public async handleUpdateSingleTopic(topicId: number, topic: ITopicUpdated): Promise<ITopicForUser> {
        const ret = await topicRepo.handleUpdateSingleTopic(topicId, topic);
        return ret;
    }

    public async handleDeleteSingleTopic(topicId: number): Promise<void> {
        await topicRepo.handleDeleteSingleTopic(topicId);
    }
}

export default TopicService;
