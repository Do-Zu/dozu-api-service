import { BadRequest, NotFoundError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import requestHelper from '@/core/request/request.helper';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { Request, Response } from 'express';
import {
    IClassTopicComment,
    ICreateCommentBody,
    IGetCommentsQuery,
} from '@/types/class-based-learning/classTopicComment.type';
import classTopicCommentService from '@/services/class-based-learning/classTopicComment.service';

class ClassTopicCommentController {
    private DEFAULT_LIMIT_GET_COMMENTS = 20;
    private MAX_GET_COMMENTS_PER_PAGE = 100;

    public async getCommentById(req: Request, res: Response) {
        const commentId = req.body?.commentId;

        const result: IClassTopicComment | undefined = await classTopicCommentService.getCommentById(commentId);

        if (!result) {
            throw new NotFoundError('Comment not found');
        }

        SuccessResponse.ok(res, result);
    }

    public async getCommentsByNode(req: Request, res: Response) {
        let { nodeId, typeNode, includeReplies, limit, page } = req.body;

        if (!nodeId || !typeNode) {
            throw new NotFoundError('nodeId and typeNode are required');
        }

        if (!page) {
            throw new NotFoundError('page is required');
        }

        if (!limit || limit < 1 || limit > this.MAX_GET_COMMENTS_PER_PAGE) {
            limit = this.DEFAULT_LIMIT_GET_COMMENTS;
        }

        let result: IClassTopicComment[];

        if (includeReplies === 'true') {
            result = await classTopicCommentService.getCommentsWithReplies(parseInt(nodeId), typeNode);
        } else {
            const filters: IGetCommentsQuery = {
                nodeId: parseInt(nodeId),
                typeNode,
                parentCmtId: null, // Only root comments
                page,
                limit,
            };
            result = await classTopicCommentService.getCommentsByFilters(filters);
        }

        SuccessResponse.ok(res, result);
    }

    public async getRepliesByComment(req: Request, res: Response) {
        const { limit, page, commentId, nodeId } = req.body;

        if (!limit || limit > this.MAX_GET_COMMENTS_PER_PAGE || !page || !nodeId) {
            throw new BadRequest('Invalid params');
        }

        if (!commentId) {
            throw new BadRequest('commentId is required');
        }

        const filters: IGetCommentsQuery = {
            parentCmtId: commentId,
            page,
            limit: limit || this.DEFAULT_LIMIT_GET_COMMENTS,
        };

        const result = await classTopicCommentService.getCommentsByFilters(filters);

        SuccessResponse.ok(res, result);
    }

    public async getCommentsByFilters(req: Request, res: Response) {
        let { nodeId, typeNode, parentCmtId, level, page, limit } = req.body;

        if (!nodeId || !typeNode || !page) {
            throw new BadRequest('Invalid params');
        }

        if (!limit || limit > this.MAX_GET_COMMENTS_PER_PAGE) {
            limit = this.DEFAULT_LIMIT_GET_COMMENTS;
        }

        const filters: IGetCommentsQuery = {
            nodeId: nodeId ?? undefined,
            typeNode,
            parentCmtId: parentCmtId ?? undefined,
            level: level ?? null,
            page,
            limit,
        };

        const result = await classTopicCommentService.getCommentsByFilters(filters);

        SuccessResponse.ok(res, result);
    }

    public async createComment(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const data: ICreateCommentBody = req.body;

        const result = await classTopicCommentService.createComment(userId, topicId, data);

        SuccessResponse.created(res, result);
    }

    // public async updateComment(req: Request, res: Response) {
    //     const userId = getUserIdFromRequest(req);
    //     const commentId = requestHelper.getIdParam(req, 'commentId');
    //     const data: IUpdateCommentBody = req.body;

    //     const result = await classTopicCommentService.updateComment(commentId, userId, data);
    //     SuccessResponse.ok(res, result);
    // }

    // public async deleteComment(req: Request, res: Response) {
    //     const userId = getUserIdFromRequest(req);
    //     const commentId = requestHelper.getIdParam(req, 'commentId');

    //     await classTopicCommentService.deleteComment(commentId, userId);
    //     SuccessResponse.ok(res, { message: 'Comment deleted successfully' });
    // }

    // public async getMyComments(req: Request, res: Response) {
    //     const userId = getUserIdFromRequest(req);

    //     const result = await classTopicCommentService.getCommentsByAuthor(userId);
    //     SuccessResponse.ok(res, result);
    // }

    // public async addReaction(req: Request, res: Response) {
    //     const userId = getUserIdFromRequest(req);
    //     const commentId = requestHelper.getIdParam(req, 'commentId');
    //     const { reactionType }: ICommentReactionBody = req.body;

    //     await classTopicCommentService.addReaction(commentId, userId, reactionType);
    //     SuccessResponse.ok(res, { message: 'Reaction added successfully' });
    // }

    // public async removeReaction(req: Request, res: Response) {
    //     const userId = getUserIdFromRequest(req);
    //     const commentId = requestHelper.getIdParam(req, 'commentId');

    //     await classTopicCommentService.removeReaction(commentId, userId);
    //     SuccessResponse.ok(res, { message: 'Reaction removed successfully' });
    // }
}

const classTopicCommentController = new ClassTopicCommentController();
export default classTopicCommentController;
