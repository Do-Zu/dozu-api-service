import { DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
// import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentDateFromRequest } from '@/utils/date';
import { ICreateTopicBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';
import { updateTopicIdOfInputSet } from '@/repositories/inputSet.repo';
import requestHelper from '@/core/request/request.helper';

class TopicController {
    constructor() {}

    public async getTopicById(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');

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
            if (inputSetId) {
                const topicId = result.topicId;
                await updateTopicIdOfInputSet({ topicId: topicId, inputSetId: parseInt(inputSetId) });
            }
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.created(res, result);
    }

    public async updateTopicById(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
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
        const topicId = requestHelper.getIdParam(req, 'topicId');

        try {
            await topicService.deleteTopicById(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, topicId);
    }
}

export default new TopicController();
