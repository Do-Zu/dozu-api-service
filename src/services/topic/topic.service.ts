import topicRepo, { ICreateTopicRepo, IUpdateTopicRepo } from '@/repositories/topic.repo';
import { ICreateTopicBody, ITopic } from '@/types/topic/topic.type';

class TopicService {
    public async doesTopicExist(topicId: number): Promise<boolean> {
        const topic = await topicRepo.getTopicById(topicId);
        return topic ? true : false;
    }

    public async getTopicById(topicId: number): Promise<ITopic | undefined> {
        const topic = await topicRepo.getTopicById(topicId);
        return topic;
    }

    public async getTopicsForUser(userId: number, currentDate: string): Promise<ITopic[]> {
        const topics = await topicRepo.getTopicsForUser(userId, currentDate);
        return topics;
    }

    public async createTopicForUser(userId: number, topic: ICreateTopicBody): Promise<ITopic> {
        const value: ICreateTopicRepo = { ...topic, userId };
        const result = await topicRepo.createTopicForUser(value);
        return result;
    }

    public async updateTopicById(topicId: number, topic: IUpdateTopicRepo): Promise<ITopic> {
        const result = await topicRepo.updateTopicById(topicId, topic);
        return result;
    }

    public async deleteTopicById(topicId: number): Promise<void> {
        await topicRepo.deleteTopicById(topicId);
    }

    // this function get topics in specific class, and get individualized information of user (eg. SM-2)
    public async getTopicsForClass(classId: number, userId: number, currentDate: string): Promise<ITopic[]> {
        const result = await topicRepo.getTopicsForClass(classId, userId, currentDate);
        return result;
    }

    public async getTopicsInClassForStudent(classId: number, userId: number, currentDate: string): Promise<ITopic[]> {
        const result = await topicRepo.getTopicsInClassForStudent(classId, userId, currentDate);
        return result;
    }

    public async getTopicsInClassForTeacher(classId: number): Promise<ITopic[]> {
        const result = await topicRepo.getTopicsInClassForTeacher(classId);
        return result;
    }
}

export default new TopicService();
