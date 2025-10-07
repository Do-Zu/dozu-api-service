import { Request, Response } from 'express';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { SuccessResponse } from '@/core/success';
import topicService from '@/services/topic/topic.service';
import { BadRequest } from '@/core/error';
import { backlogService } from '@/services/backlog/backlog.service';
import type {
    BacklogCountQueryDto,
    BacklogReserveDto,
    BacklogAddDto,
    BacklogCommitDto,
    BacklogReleaseDto,
    BacklogClearQueryDto,
} from '@/dtos/backlog/backlog.dto';

class BacklogController {
    async handleCount(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (!req.validated || !req.validated.query) {
            throw new BadRequest('Validated query is missing');
        }
        const { topicId } = req.validated.query as BacklogCountQueryDto;

        const existed = await topicService.doesTopicExist(topicId);
        if (!existed) throw new BadRequest('Topic does not exist');

        const count = await backlogService.count(userId, topicId);
        SuccessResponse.ok(res, { count });
    }

    async handleAdd(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (!req.validated || !req.validated.body) {
            throw new BadRequest('Validated body is missing');
        }
        const { topicId, items } = req.validated.body as BacklogAddDto;

        const existed = await topicService.doesTopicExist(topicId);
        if (!existed) throw new BadRequest('Topic does not exist');

        const result = await backlogService.add(userId, topicId, items);
        SuccessResponse.created(res, result, 'Backlog items added');
    }

    async handleReserve(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (!req.validated || !req.validated.body) {
            throw new BadRequest('Validated body is missing');
        }
        const { topicId, limit, clientRequestId } = req.validated.body as BacklogReserveDto;

        const existed = await topicService.doesTopicExist(topicId);
        if (!existed) throw new BadRequest('Topic does not exist');

        const items = await backlogService.reserve(userId, topicId, limit, clientRequestId);
        SuccessResponse.ok(res, { items });
    }

    async handleCommit(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (!req.validated || !req.validated.body) {
            throw new BadRequest('Validated body is missing');
        }
        const { topicId, itemIds } = req.validated.body as BacklogCommitDto;
        const updated = await backlogService.commit(userId, topicId, itemIds);
        SuccessResponse.ok(res, { updated }, 'Committed');
    }

    async handleRelease(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (!req.validated || !req.validated.body) {
            throw new BadRequest('Validated body is missing');
        }
        const { topicId, itemIds } = req.validated.body as BacklogReleaseDto;
        const updated = await backlogService.release(userId, topicId, itemIds);
        SuccessResponse.ok(res, { updated }, 'Released');
    }

    async handleClear(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        if (!req.validated || !req.validated.query) {
            throw new BadRequest('Validated query is missing');
        }
        const { topicId, force } = req.validated.query as BacklogClearQueryDto;
        await backlogService.clear(userId, topicId, force);
        SuccessResponse.noContent(res);
    }
}

export const backlogController = new BacklogController();
