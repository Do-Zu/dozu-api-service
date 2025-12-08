import topicRepo, { ICreateTopicRepo } from '@/repositories/topic.repo';
import { ICreateTopicService } from '../topic/topic.service';
import { ITopic } from '@/types/topic/topic.type';
import { addMinutes } from 'date-fns';
import { learnAheadLimit } from '../spaced-repetition-system/super-memo-2/anki.service';

class ClassTopicService {
    public async getTopicsInClassForStudent(classId: number, userId: number, currentDate: string): Promise<ITopic[]> {
        const dueDate = addMinutes(new Date(currentDate), learnAheadLimit);
        const result = await topicRepo.getTopicsInClassForStudent(classId, userId, dueDate.toISOString());
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
