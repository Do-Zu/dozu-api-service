import db from '@/libs/drizzleClient.lib';
import flashcardRepo from '@/repositories/flashcard.repo';
import topicRepo, { ICreateTopicRepo, IUpdateTopicRepo } from '@/repositories/topic.repo';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';
import { ICreateTopicBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';

export type ICreateTopicService = ICreateTopicBody & { imageUrl?: string | null };
export type IUpdateTopicService = IUpdateTopicBody & { imageUrl?: string | null };

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

    public async createTopicForUser(userId: number, topic: ICreateTopicService): Promise<ITopic> {
        const value: ICreateTopicRepo = { ...topic, userId };
        if (value.imageUrl === undefined) {
            delete value.imageUrl;
        }
        const result = await topicRepo.createTopicForUser(value);
        return result;
    }

    public async updateTopicById(topicId: number, topic: IUpdateTopicService): Promise<ITopic> {
        let value: IUpdateTopicRepo = { ...topic };
        if (value.imageUrl === undefined || value.imageUrl === null) {
            delete value.imageUrl;
        }
        const result = await topicRepo.updateTopicById(topicId, value);
        return result;
    }

    public async deleteTopicById(topicId: number): Promise<void> {
        await db.transaction(async tx => {
            // mindmap deletion
            //... (delete resources related to ONLY mindmap if necessary)

            // flashcard deletion
            await flashcardRepo.deleteFlashcardsInTopic(topicId, tx);

            // quiz deletion
            //... (delete resources related to ONLY quiz if necessary)

            // sm-2 information deletion 
            // todo-ka: should annouce teacher that deleting topic would clear sm-2 info of students
            await itemSpacedRepetitionTrackingRepo.deleteTrackingRecordsByTopicId(topicId, tx);

            // topic deletion
            await topicRepo.deleteTopicById(topicId, tx);
        })
    }
}

export default new TopicService();
