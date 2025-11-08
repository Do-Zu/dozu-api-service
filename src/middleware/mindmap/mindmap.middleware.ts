import { BadRequest, Forbidden } from '@/core/error';
import topicRepo from '@/repositories/topic.repo';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';

export const verifyMindmapOwner = async (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserIdFromRequest(req);
    const topicId = parseInt(req.params.topicId);

    if (!topicId) {
        throw new BadRequest('Missing topic id');
    }

    const result = await topicRepo.getUserIdOfTopic(topicId);

    if (result.userId === userId) {
        next();
    } else {
        const message = 'Forbidden: Unauthorized mindmap delete request';
        logger.warn(message);
        throw new Forbidden(message);
    }
};
