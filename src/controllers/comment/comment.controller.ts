import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import commentService from '@/services/comment/comment.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import requestHelper from '@/core/request/request.helper';
import { ICreateCommentBody, IUpdateCommentBody } from '@/types/comment/comment.type';

class CommentController {
    private DEFAULT_LIMIT = 20;
    private MAX_LIMIT = 100;

    private getIdFromParams(req: Request, paramName: string): number {
        const paramValue = req.params[paramName];
        if (!paramValue) {
            throw new BadRequest(`Missing ${paramName} parameter`);
        }
        const id = parseInt(paramValue);
        if (isNaN(id) || id <= 0) {
            throw new BadRequest(`Invalid ${paramName} parameter`);
        }
        return id;
    }

    public getCommentById = async (req: Request, res: Response): Promise<void> => {
        const commentId = this.getIdFromParams(req, 'commentId');
        
        const comment = await commentService.getCommentById(commentId);
        
        if (!comment) {
            throw new BadRequest('Comment not found');
        }

        SuccessResponse.ok(res, comment);
    };

    public getCommentsByAssignmentId = async (req: Request, res: Response): Promise<void> => {
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(
            parseInt(req.query.limit as string) || this.DEFAULT_LIMIT,
            this.MAX_LIMIT
        );

        const comments = await commentService.getCommentsByAssignmentId(assignmentId, page, limit);

        SuccessResponse.ok(res, {
            comments,
            page,
            limit,
            total: comments.length,
        });
    };

    public getCommentsByLearningMaterialId = async (req: Request, res: Response): Promise<void> => {
        const learningMaterialId = this.getIdFromParams(req, 'learningMaterialId');
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(
            parseInt(req.query.limit as string) || this.DEFAULT_LIMIT,
            this.MAX_LIMIT
        );

        const comments = await commentService.getCommentsByLearningMaterialId(learningMaterialId, page, limit);

        SuccessResponse.ok(res, {
            comments,
            page,
            limit,
            total: comments.length,
        });
    };

    public createCommentForAssignment = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const data = req.body as ICreateCommentBody;

        if (!data.content || data.content.trim().length === 0) {
            throw new BadRequest('Comment content is required');
        }

        const comment = await commentService.createCommentForAssignment(assignmentId, userId, data);

        SuccessResponse.created(res, comment, 'Comment created successfully');
    };

    public createCommentForLearningMaterial = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);
        const learningMaterialId = this.getIdFromParams(req, 'learningMaterialId');
        const data = req.body as ICreateCommentBody;

        if (!data.content || data.content.trim().length === 0) {
            throw new BadRequest('Comment content is required');
        }

        const comment = await commentService.createCommentForLearningMaterial(learningMaterialId, userId, data);

        SuccessResponse.created(res, comment, 'Comment created successfully');
    };

    public updateComment = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);
        const commentId = this.getIdFromParams(req, 'commentId');
        const data = req.body as IUpdateCommentBody;

        if (!data.content || data.content.trim().length === 0) {
            throw new BadRequest('Comment content is required');
        }

        const comment = await commentService.updateComment(commentId, userId, data);

        SuccessResponse.ok(res, comment, 'Comment updated successfully');
    };

    public getCommentsBySubmissionId = async (req: Request, res: Response): Promise<void> => {
        const submissionId = this.getIdFromParams(req, 'submissionId');
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(
            parseInt(req.query.limit as string) || this.DEFAULT_LIMIT,
            this.MAX_LIMIT
        );

        const comments = await commentService.getCommentsBySubmissionId(submissionId, page, limit);

        SuccessResponse.ok(res, {
            comments,
            page,
            limit,
            total: comments.length,
        });
    };

    public createCommentForSubmission = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);
        const submissionId = this.getIdFromParams(req, 'submissionId');
        const data = req.body as ICreateCommentBody;

        if (!data.content || data.content.trim().length === 0) {
            throw new BadRequest('Comment content is required');
        }

        const comment = await commentService.createCommentForSubmission(submissionId, userId, data);

        SuccessResponse.created(res, comment, 'Comment created successfully');
    };

    public deleteComment = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);
        const commentId = this.getIdFromParams(req, 'commentId');

        await commentService.deleteComment(commentId, userId);

        SuccessResponse.ok(res, null, 'Comment deleted successfully');
    };
}

export default new CommentController();

