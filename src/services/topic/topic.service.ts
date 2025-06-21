import TopicRepo, { ITopicsForUserReturned } from '@/repositories/topic.repo';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';

const topicRepo = new TopicRepo();

class TopicService {
  public async handleIsExistedTopic(topicId: number): Promise<boolean> {
    const topic = await topicRepo.handleGetSingleTopic(topicId);
    return topic ? true : false;
  }

  public async handleGetSingleTopic(
    topicId: number
  ): Promise<ITopicBasic | undefined> {
    const topic = await topicRepo.handleGetSingleTopic(topicId);
    return topic;
  }

  public async handleGetAllTopicsForUser(userId: number): Promise<ITopicsForUserReturned> {
    const topics = await topicRepo.handleGetAllTopicsForUser(userId);
    return topics;
  }

  public async handleInsertSingleTopicForUser(
    topic: ITopicAdded
  ): Promise<void> {
    await topicRepo.handleInsertSingleTopicForUser(topic);
  }

  public async handleUpdateSingleTopic(
    topicId: number,
    topic: ITopicUpdated
  ): Promise<void> {
    await topicRepo.handleUpdateSingleTopic(topicId, topic);
  }

  public async handleDeleteSingleTopic(topicId: number): Promise<void> {
    await topicRepo.handleDeleteSingleTopic(topicId);
  }
}

export default TopicService;
