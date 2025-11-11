import db from '@/libs/drizzleClient.lib';
import flashcardRepo from '@/repositories/flashcard.repo';
import { deleteMindmapByTopicId } from '@/repositories/mindmap/mindmap.repo';
import topicRepo, { ICreateTopicRepo, IUpdateTopicRepo } from '@/repositories/topic.repo';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';
import { ICreateTopicBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';
import { addMinutes } from 'date-fns';
import { learnAheadLimit } from '../spaced-repetition-system/super-memo-2/anki.service';
import ankiSettingService from '../anki-setting/ankiSetting.service';

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

    public async getTopicWithCardCounts({
        userId,
        topicId,
        currentDate,
    }: {
        userId: number;
        topicId: number;
        currentDate: string;
    }): Promise<ITopic | undefined> {
        const dueDate = addMinutes(new Date(currentDate), learnAheadLimit);
        let topic = await topicRepo.getTopicWithCardCounts({ userId, topicId, dueDate: dueDate.toISOString() });

        if (topic) {
            const ankiSetting = await ankiSettingService.getSettingForTopicAndUser(topicId, userId);
            if (topic.flashcardCounts) {
                topic.flashcardCounts.new = Math.min(topic.flashcardCounts.new, ankiSetting.newCardsPerDay);
                topic.flashcardCounts.review = Math.min(topic.flashcardCounts.review, ankiSetting.maximumReviewsPerDay);
            }
        }

        return topic;
    }

    public async getTopicsForUser(userId: number, currentDate: string): Promise<ITopic[]> {
        const dueDate = addMinutes(new Date(currentDate), learnAheadLimit);
        const topics = await topicRepo.getTopicsForUser(userId, dueDate.toISOString());
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
            await deleteMindmapByTopicId(topicId, tx); //needs testing

            // flashcard deletion
            await flashcardRepo.deleteFlashcardsInTopic(topicId, tx);

            // quiz deletion
            //... (delete resources related to ONLY quiz if necessary)

            // sm-2 information deletion
            // todo-ka: should annouce teacher that deleting topic would clear sm-2 info of students
            await itemSpacedRepetitionTrackingRepo.deleteTrackingRecordsByTopicId(topicId, tx);

            // topic deletion
            await topicRepo.deleteTopicById(topicId, tx);
        });
    }
}

export default new TopicService();
