import topicRepo, { ICreateTopicRepo } from '@/repositories/topic.repo';
import { ICreateTopicService } from '../topic/topic.service';
import { ITopic } from '@/types/topic/topic.type';

class ClassTopicService {
    public async getTopicsInClassForStudent(classId: number, userId: number, currentDate: string): Promise<ITopic[]> {
        const result = await topicRepo.getTopicsInClassForStudent(classId, userId, currentDate);
        return result;
    }

    public async getTopicsInClassForTeacher(classId: number): Promise<ITopic[]> {
        const result = await topicRepo.getTopicsInClassForTeacher(classId);
        return result;
    }

    public async createTopicForClass(classId: number, userId: number, topic: ICreateTopicService) {
        const value: ICreateTopicRepo = { ...topic, classId, userId };
        const result = await topicRepo.createTopicForUser(value);
        return result;
    }
}

export default new ClassTopicService();
