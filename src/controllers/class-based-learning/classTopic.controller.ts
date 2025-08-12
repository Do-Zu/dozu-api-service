import { DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentDateFromRequest } from '@/utils/date';
import { topicsTable } from '@/models';
import db from '@/libs/drizzleClient.lib';
import { ICreateTopicInClassBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';
import { updateTopicIdOfInputSet } from '@/repositories/inputSet.repo';
import itemSpacedRepetitionTrackingService from '@/services/tracking/itemSpacedRepetitionTracking.service';
import requestHelper from '@/core/request/request.helper';

class ClassTopicController {
    public async getTopicsInClassForStudent(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');

        const currentDate = getCurrentDateFromRequest(req);
        const userId = getUserIdFromRequest(req);
        const result: ITopic[] = await topicService.getTopicsInClassForStudent(classId, userId, currentDate);

        SuccessResponse.ok(res, result);
    }

    public async getTopicsInClassForTeacher(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');

        const result: ITopic[] = await topicService.getTopicsInClassForTeacher(classId);

        SuccessResponse.ok(res, result);
    }

    public async createTopicForClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const { inputSetId } = req.body as { inputSetId: string };
        const classId = requestHelper.getIdParam(req, 'classId');

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

    public async updateTopicInClass(req: Request, res: Response) {
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

    public async deleteTopicInClass(req: Request, res: Response) {
        const topicId = requestHelper.getIdParam(req, 'topicId');

        try {
            await topicService.deleteTopicById(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, topicId);
    }

    public async startLearningFlashcards(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        try {
            await itemSpacedRepetitionTrackingService.initializeStudentTrackingForTopic(userId, topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, {});
    }
}

export default new ClassTopicController();
