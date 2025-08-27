import { NodeType } from '@/models';
import { BadRequest, NotFoundError } from '@/core/error';
import classTopicCommentRepo, { ICreateCommentRepo } from '@/repositories/class-based-learning/classTopicComment.repo';
import {
    IClassTopicComment,
    ICreateCommentBody,
    IGetCommentsQuery,
    IUpdateCommentBody,
} from '@/types/class-based-learning/classTopicComment.type';

export type ICreateCommentService = ICreateCommentBody;
export type IUpdateCommentService = IUpdateCommentBody;

class ClassTopicCommentService {
    public async getCommentById(commentId: number): Promise<IClassTopicComment | undefined> {
        const result = await classTopicCommentRepo.getCommentById(commentId);
        return result;
    }

    public async getCommentsByFilters(filters: IGetCommentsQuery): Promise<IClassTopicComment[]> {
        const result = await classTopicCommentRepo.getCommentsByFilters(filters);
        return result;
    }

    public async getCommentsWithReplies(nodeId: number, typeNode: NodeType): Promise<IClassTopicComment[]> {
        // Get root comments
        const rootComments = await classTopicCommentRepo.getRootCommentsByNode(nodeId, typeNode);

        // Get replies for each root comment
        const commentsWithReplies = await Promise.all(
            rootComments.map(async comment => {
                const replies = await classTopicCommentRepo.getRepliesByParentId(comment.commentId);
                return {
                    ...comment,
                    replies,
                };
            })
        );

        return commentsWithReplies;
    }

    public async createComment(data: ICreateCommentService): Promise<IClassTopicComment> {
        const { author, topicId } = data;

        // Calculate level for nested comments
        let level = 0;

        if (data.parentCmtId) {
            const parentComment = await classTopicCommentRepo.getCommentById(data.parentCmtId);

            if (!parentComment) {
                throw new NotFoundError('Parent comment not found');
            }

            level = parentComment.level + 1;

            // Update parent comment reply count
            await classTopicCommentRepo.incrementReplyCount(data.parentCmtId);
        }

        const createData: ICreateCommentRepo = {
            ...data,
            topicId,
            author,
            level,
        };

        const result = await classTopicCommentRepo.createComment(createData);

        return result;
    }

    public async updateComment(
        commentId: number,
        userId: number,
        data: IUpdateCommentService
    ): Promise<IClassTopicComment> {
        // Check if comment exists and user is the author
        const existingComment = await classTopicCommentRepo.getCommentById(commentId);
        if (!existingComment) {
            throw new NotFoundError('Comment not found');
        }

        if (existingComment.author.user_id !== userId) {
            throw new BadRequest('You can only edit your own comments');
        }

        const result = await classTopicCommentRepo.updateComment(commentId, data);
        return result;
    }

    public async deleteComment(commentId: number, userId: number): Promise<void> {
        // Check if comment exists and user is the author
        const existingComment = await classTopicCommentRepo.getCommentById(commentId);
        if (!existingComment) {
            throw new NotFoundError('Comment not found');
        }

        if (existingComment.author.user_id !== userId) {
            throw new BadRequest('You can only delete your own comments');
        }

        // If it's a reply, decrement parent's reply count
        if (existingComment.parentCmtId) {
            await classTopicCommentRepo.decrementReplyCount(existingComment.parentCmtId);
        }

        await classTopicCommentRepo.softDeleteComment(commentId);
    }

    public async getCommentsByAuthor(userId: number): Promise<IClassTopicComment[]> {
        const result = await classTopicCommentRepo.getCommentsByAuthor(userId);
        return result;
    }

    // TODO: Implement reaction functionality
    // public async addReaction(commentId: number, userId: number, reactionType: string): Promise<void> {
    //     // Implementation for adding reactions to comments
    //     // This would require a separate reactions table
    //     throw new Error('Reaction functionality not implemented yet');
    // }

    // public async removeReaction(commentId: number, userId: number): Promise<void> {
    //     // Implementation for removing reactions from comments
    //     throw new Error('Reaction functionality not implemented yet');
    // }
}

const classTopicCommentService = new ClassTopicCommentService();

export default classTopicCommentService;
