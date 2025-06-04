import TopicRepo from '@/repositories/topic.repo';
import { IBasicTopic, ITopic } from '@/types/topic/topic.type';

const topicRepo = new TopicRepo();

class TopicService {
  public async handleIsExistedTopic(topicId: number): Promise<boolean> {
    const topic = await topicRepo.handleGetSingleTopic(topicId);
    return topic ? true : false;
  }

  public async handleGetSingleTopic(
    topicId: number
  ): Promise<Pick<ITopic, 'topicId' | 'name' | 'description'> | undefined> {
    const topic = await topicRepo.handleGetSingleTopic(topicId);
    return topic;
  }

  public async handleGetAllTopicsForUser(userId: number): Promise<IBasicTopic[]> {
    const topics = await topicRepo.handleGetAllTopicsForUser(userId);
    return topics;
  }

  public async handleInsertSingleTopicForUser(
    topic: Pick<ITopic, 'userId' | 'name' | 'description'>
  ): Promise<Pick<ITopic, 'topicId' | 'name' | 'description'>> {
    const topicAdded = await topicRepo.handleInsertSingleTopicForUser(topic);
    return topicAdded;
  }

  public async handleUpdateSingleTopic(
    topicId: number,
    topic: Pick<ITopic, 'name' | 'description'>
  ): Promise<Pick<ITopic, 'topicId' | 'name' | 'description'>> {
    const topicUpdated = await topicRepo.handleUpdateSingleTopic(topicId, topic);
    return topicUpdated;
  }

  public async handleDeleteSingleTopic(topicId: number): Promise<void> {
    await topicRepo.handleDeleteSingleTopic(topicId);
  }
}

// const handleIsExistedTopic = async(topicId: number) => {
//     const topic = await topicRepo.handleIsExistedTopic(topicId);
//     return topic ? true : false;
// }

// const topicService = { handleIsExistedTopic };

export default TopicService;
