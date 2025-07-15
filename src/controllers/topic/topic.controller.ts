import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
// import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';
import { getCurrentDateFromRequest } from '@/utils/date';
import { topicsTable } from '@/models';
import db from '@/libs/drizzleClient.lib';
import { ICreateTopicBody, ICreateTopicInClassBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';
import itemSpacedRepetitionTrackingService from '@/services/tracking/itemSpacedRepetitionTracking.service';
import { updateTopicIdOfInputSet } from '@/repositories/inputSet.repo';

class TopicController {
    constructor() {}

    public async getTopicById(req: Request, res: Response): Promise<void> {
        let { topicId } = req.validatedParams as { topicId: number };

        let topic: ITopic | undefined;
        try {
            topic = await topicService.getTopicById(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, topic);
    }

    public async getTopicsForUser(req: Request, res: Response): Promise<void> {
        const currentDate = getCurrentDateFromRequest(req);
        const userId = getUserIdFromRequest(req);

        let topics: ITopic[];
        try {
            topics = await topicService.getTopicsForUser(userId, currentDate);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, topics);
    }

    public async createTopicForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const { name, description } = req.body as ICreateTopicBody;
        const { inputSetId } = req.body as { inputSetId: string };

        let result;
        try {
            result = await topicService.createTopicForUser(userId, { name, description });
            if(inputSetId) {
                const topicId = result.topicId;
                await updateTopicIdOfInputSet({ topicId: topicId, inputSetId: parseInt(inputSetId) });
            }
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, result);
    }

    public async updateTopicById(req: Request, res: Response): Promise<void> {
        let { topicId } = req.validatedParams as { topicId: number };
        const { name, description } = req.body as IUpdateTopicBody;

        let result;
        try {
            result = await topicService.updateTopicById(topicId, { name, description });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, result);
    }

    // còn flashcards -> vẫn xóa topic
    public async deleteTopicById(req: Request, res: Response): Promise<void> {
        let { topicId } = req.validatedParams as { topicId: number };

        try {
            await topicService.deleteTopicById(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.noContent(res);
    }

    public async getTopicsInClass(req: Request, res: Response) {
        const teacher = await isTeacher(req);
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        let result : ITopic[];
        try {
            if(teacher) {
                result = await topicService.getTopicsInClassForTeacher(classId);
            } else {
                const currentDate = getCurrentDateFromRequest(req);
                const userId = getUserIdFromRequest(req);
                result = await topicService.getTopicsInClassForStudent(classId, userId, currentDate);
            }
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, result);
    }

    public async createTopicForClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot get topics');
        }
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        const { name, description } = req.body as ICreateTopicInClassBody;

        const dataInserted = { userId, classId, name, description };

        let result;
        try {
            [result] = await db.insert(topicsTable).values(dataInserted).returning({
                topicId: topicsTable.topicId,
                classId: topicsTable.classId,
                name: topicsTable.name,
                description: topicsTable.description,
                createdAt: topicsTable.createdAt,
            });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, result);
    }

    public async startLearningFlashcards(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot start learning flashcards');
        }

        let { topicId } = req.validatedParams as { topicId: number };

        try {
            await itemSpacedRepetitionTrackingService.initializeStudentTrackingForTopic(userId, topicId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, { });
    }
}

export default new TopicController();
