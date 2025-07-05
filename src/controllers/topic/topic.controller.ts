import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { ITopicsForUserReturned } from '@/repositories/topic.repo';
import { getCurrentDateFromRequest } from '@/utils/date';
import { topicsTable } from '@/models';
import db from '@/libs/drizzleClient.lib';
import { eq } from 'drizzle-orm';

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

        const { name, description } = req.body as {
            name: string;
            description: string;
        };
        const topicAddedValue: ITopicAdded = {
            userId,
            name,
            description,
        };

        let data;
        try {
            data = await topicService.handleInsertSingleTopicForUser(topicAddedValue);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, data);
    }

    public async handleUpdateSingleTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.params as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot update topic');
        }

        const { name, description } = req.body as {
            name: string;
            description: string;
        };
        const topicUpdatedValue: ITopicUpdated = {
            name: name,
            description: description,
        };

        let data;
        try {
            data = await topicService.handleUpdateSingleTopic(topicId, topicUpdatedValue);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, data);
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

    public async handleGetAllTopicsInClass(req: Request, res: Response) {
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        let data;
        try {
            data = await db
                .select({
                    topicId: topicsTable.topicId,
                    classId: topicsTable.classId,
                    name: topicsTable.name,
                    description: topicsTable.description,
                    imageUrl: topicsTable.imageUrl,
                    createdAt: topicsTable.createdAt,
                })
                .from(topicsTable)
                .where(eq(topicsTable.classId, classId));
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, data);
    }

    public async handleCreateTopicInClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot insert topic');
        }
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        const { name, description } = req.body as {
            name: string;
            description: string;
        };

        const dataInserted = { userId, classId, name, description };

        let data;
        try {
            [data] = await db
                .insert(topicsTable)
                .values(dataInserted)
                .returning({
                    topicId: topicsTable.topicId,
                    classId: topicsTable.classId,
                    name: topicsTable.name,
                    description: topicsTable.description,
                    createdAt: topicsTable.createdAt,
                })
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, data);
    }
}

export default new TopicController();
