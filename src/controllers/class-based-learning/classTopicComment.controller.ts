import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest, Forbidden, NotFoundError } from '@/core/error';
import classTopicCommentService from '@/services/class-based-learning/classTopicComment.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import {
    IClassTopicComment,
    ICreateCommentBody,
    IGetCommentsQuery,
} from '@/types/class-based-learning/classTopicComment.type';

class ClassTopicCommentController {
    private DEFAULT_LIMIT_GET_COMMENTS: number;
    private MAX_GET_COMMENTS_PER_PAGE: number;

    constructor() {
        this.DEFAULT_LIMIT_GET_COMMENTS = 20;
        this.MAX_GET_COMMENTS_PER_PAGE = 100;

        this.getCommentById = this.getCommentById.bind(this);
        this.getCommentsByNode = this.getCommentsByNode.bind(this);
        this.getRepliesByComment = this.getRepliesByComment.bind(this);
        this.getCommentsByFilters = this.getCommentsByFilters.bind(this);
        this.createComment = this.createComment.bind(this);
    }

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
            result = await classTopicCommentService.getCommentsWithReplies(nodeId, typeNode);
        } else {
            const filters: IGetCommentsQuery = {
                nodeId,
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
        const { limit, page, parentCmtId, nodeId, typeNode } = req.body;

        if (!limit || limit > this.MAX_GET_COMMENTS_PER_PAGE || !page || !nodeId) {
            throw new BadRequest('Invalid params');
        }

        const filters: IGetCommentsQuery = {
            nodeId,
            parentCmtId,
            typeNode,
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

        const data: ICreateCommentBody = req.body;

        if (userId !== data?.author?.user_id) {
            throw new Forbidden('user is not allowed to create this comment');
        }

        const result = await classTopicCommentService.createComment(data);

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

export const classTopicCommentController = new ClassTopicCommentController();
