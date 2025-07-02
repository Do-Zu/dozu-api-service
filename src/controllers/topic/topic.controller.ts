import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { ITopicsForUserReturned } from '@/repositories/topic.repo';
import { getCurrentDateFromRequest } from '@/utils/date';

class TopicController {
    constructor() {}

    public async handleGetSingleTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.params as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot get topic');
        }

        let topic: ITopicBasic | undefined;

        try {
            topic = await topicService.handleGetSingleTopic(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, topic);
    }

    public async handleGetAllTopicsForUser(req: Request, res: Response): Promise<void> {
        const currentDate = getCurrentDateFromRequest(req);
        const userId = getUserIdFromRequest(req);
        if (isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot get topics');
        }

        let topics: ITopicsForUserReturned;
        try {
            topics = await topicService.handleGetAllTopicsForUser(userId, currentDate);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, topics);
    }

    public async handleInsertSingleTopicForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);

        if (isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot insert topic');
        }

        const { topicName, topicDescription } = req.body as {
            topicName: string;
            topicDescription: string;
        };
        const topicAddedValue: ITopicAdded = {
            userId,
            name: topicName,
            description: topicDescription,
        };

        let dataResponsed;
        try {
            dataResponsed = await topicService.handleInsertSingleTopicForUser(topicAddedValue);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, dataResponsed);
    }

    public async handleUpdateSingleTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.params as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot update topic');
        }

        const { topicName, topicDescription } = req.body as {
            topicName: string;
            topicDescription: string;
        };
        const topicUpdatedValue: ITopicUpdated = {
            name: topicName,
            description: topicDescription,
        };

        let dataResponsed;
        try {
            dataResponsed = await topicService.handleUpdateSingleTopic(topicId, topicUpdatedValue);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, dataResponsed);
    }

    // còn flashcards -> vẫn xóa topic
    public async handleDeleteSingleTopicForUser(req: Request, res: Response): Promise<void> {
        let { topicId } = req.params as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot update topic');
        }

        try {
            await topicService.handleDeleteSingleTopic(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.noContent(res);
    }
}

export default new TopicController();
