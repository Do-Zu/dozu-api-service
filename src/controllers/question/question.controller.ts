import { Request, Response } from 'express';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { questionService } from '@/services/question/question.service';
import topicService from '@/services/topic/topic.service';
import { QuestionBatchPayload } from '@/dtos/question/ question.dto';

class QuestionController {
    constructor() {}

    async handleGetAllQuestionsForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.query as { topicId: string | number };
        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) throw new BadRequest('Invalid param, cannot get questions');
        const topic = await topicService.getTopicById(topicId);
        if (!topic) throw new BadRequest('Invalid topic');

        try {
            const questions = await questionService.handleGetAllQuestionsForTopic(topicId);
            const topicName = topic.name;
            SuccessResponse.ok(res, { questions, topicName });
        } catch (err) {
            throw new DatabaseError('Something went wrong while fetching questions');
        }
    }
    async handleBatchQuestionsForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.query as { topicId: string | number };
        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            throw new BadRequest('Invalid topicId');
        }

        const isExisted = await topicService.doesTopicExist(topicId);
        if (!isExisted) {
            throw new BadRequest('Topic does not exist');
        }

        const { insert, update, delete: deleteIds }: QuestionBatchPayload = req.body;

        try {
            await questionService.handleBatchQuestions(topicId, {
                insert,
                update,
                delete: deleteIds,
            });
        } catch (err) {
            throw new DatabaseError('Failed to batch process questions');
        }

        SuccessResponse.created(res, {});
    }
}

export const questionController = new QuestionController();
