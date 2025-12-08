import { BadRequest, DatabaseError, Forbidden, NotFoundError } from '@/core/error';
import commentRepo, { ICreateCommentRepo, IUpdateCommentRepo } from '@/repositories/comment/comment.repo';
import { IComment, ICreateCommentBody, IUpdateCommentBody } from '@/types/comment/comment.type';
import db from '@/libs/drizzleClient.lib';
import { assignmentCommentsTable } from '@/models/class-based-learning/assignment/assignmentComment.model';
import { learningMaterialCommentsTable } from '@/models/learning-material/learningMaterialComment.model';
import { eq, and, isNull } from 'drizzle-orm';

class CommentService {
    private mapCommentToIComment(result: any): IComment {
        return {
            commentId: result.commentId,
            senderId: result.senderId,
            content: result.content,
            parentCommentId: result.parentCommentId ?? null,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            sender: result.sender ? {
                userId: result.sender.userId,
                username: result.sender.username,
                fullName: result.sender.fullName,
                avatarUrl: result.sender.avatarUrl,
            } : undefined,
        };
    }

    private async attachReplies(comment: IComment, executor: any = db): Promise<IComment> {
        const replies = await commentRepo.getRepliesByCommentId(comment.commentId, executor);
        // Recursively attach replies for infinite tree support
        comment.replies = await Promise.all(
            replies.map(async (reply) => {
                const mappedReply = this.mapCommentToIComment(reply);
                await this.attachReplies(mappedReply, executor);
                return mappedReply;
            })
        );
        return comment;
    }

    public async getCommentById(commentId: number): Promise<IComment | null> {
        const result = await commentRepo.getCommentById(commentId);
        if (!result) {
            return null;
        }
        const comment = this.mapCommentToIComment(result);
        await this.attachReplies(comment);
        return comment;
    }

    public async getCommentsByAssignmentId(
        assignmentId: number,
        page: number = 1,
        limit: number = 20
    ): Promise<IComment[]> {
        const offset = (page - 1) * limit;
        const results = await commentRepo.getCommentsByAssignmentId(assignmentId, limit, offset);
        
        // Attach replies to each comment
        const comments = await Promise.all(
            results.map(async (result) => {
                const comment = this.mapCommentToIComment(result);
                await this.attachReplies(comment);
                return comment;
            })
        );
        
        return comments;
    }

    public async getCommentsByLearningMaterialId(
        learningMaterialId: number,
        page: number = 1,
        limit: number = 20
    ): Promise<IComment[]> {
        const offset = (page - 1) * limit;
        const results = await commentRepo.getCommentsByLearningMaterialId(learningMaterialId, limit, offset);
        
        // Attach replies to each comment
        const comments = await Promise.all(
            results.map(async (result) => {
                const comment = this.mapCommentToIComment(result);
                await this.attachReplies(comment);
                return comment;
            })
        );
        
        return comments;
    }

    public async createCommentForAssignment(
        assignmentId: number,
        userId: number,
        data: ICreateCommentBody
    ): Promise<IComment> {
        return await db.transaction(async (tx) => {
            try {
                // If this is a reply, validate parent comment
                if (data.parentCommentId) {
                    const parentComment = await commentRepo.getCommentById(data.parentCommentId, tx);
                    if (!parentComment) {
                        throw new NotFoundError('Parent comment not found');
                    }
                    
                    // Verify parent comment belongs to the same assignment (can be top-level or nested reply)
                    // For nested replies, we need to check if the parent comment (or any ancestor) is linked to this assignment
                    const [parentAssignmentComment] = await tx
                        .select()
                        .from(assignmentCommentsTable)
                        .where(
                            and(
                                eq(assignmentCommentsTable.commentId, data.parentCommentId),
                                eq(assignmentCommentsTable.assignmentId, assignmentId),
                                isNull(assignmentCommentsTable.submissionId) // Must be a public comment
                            )
                        )
                        .limit(1);
                    
                    if (!parentAssignmentComment) {
                        throw new BadRequest('Parent comment does not belong to this assignment');
                    }
                    
                    // Allow infinite nested replies - no depth limit
                    // User can reply to their own comments to create infinite tree
                }

                // Create comment
                const createData: ICreateCommentRepo = {
                    senderId: userId,
                    content: data.content,
                    parentCommentId: data.parentCommentId ?? null,
                };
                const comment = await commentRepo.createComment(createData, tx);

                // Link comment to assignment (public comment - no submissionId)
                await tx
                    .insert(assignmentCommentsTable)
                    .values({
                        commentId: comment.commentId,
                        assignmentId: assignmentId,
                        submissionId: null, // Public comment
                    });

                // Get full comment with sender info
                const fullComment = await commentRepo.getCommentById(comment.commentId, tx);
                if (!fullComment) {
                    throw new DatabaseError('Failed to retrieve created comment');
                }

                return this.mapCommentToIComment(fullComment);
            } catch (err) {
                if (err instanceof DatabaseError || err instanceof NotFoundError || err instanceof BadRequest) throw err;
                throw new DatabaseError('Failed to create comment');
            }
        });
    }

    public async createCommentForLearningMaterial(
        learningMaterialId: number,
        userId: number,
        data: ICreateCommentBody
    ): Promise<IComment> {
        return await db.transaction(async (tx) => {
            try {
                // If this is a reply, validate parent comment
                if (data.parentCommentId) {
                    const parentComment = await commentRepo.getCommentById(data.parentCommentId, tx);
                    if (!parentComment) {
                        throw new NotFoundError('Parent comment not found');
                    }
                    
                    // Verify parent comment belongs to the same learning material (can be top-level or nested reply)
                    // For nested replies, we need to check if the parent comment (or any ancestor) is linked to this learning material
                    const [parentLearningMaterialComment] = await tx
                        .select()
                        .from(learningMaterialCommentsTable)
                        .where(
                            and(
                                eq(learningMaterialCommentsTable.commentId, data.parentCommentId),
                                eq(learningMaterialCommentsTable.learningMaterialId, learningMaterialId)
                            )
                        )
                        .limit(1);
                    
                    if (!parentLearningMaterialComment) {
                        throw new BadRequest('Parent comment does not belong to this learning material');
                    }
                    
                    // Allow infinite nested replies - no depth limit
                    // User can reply to their own comments to create infinite tree
                }

                // Create comment
                const createData: ICreateCommentRepo = {
                    senderId: userId,
                    content: data.content,
                    parentCommentId: data.parentCommentId ?? null,
                };
                const comment = await commentRepo.createComment(createData, tx);

                // Link comment to learning material
                await tx
                    .insert(learningMaterialCommentsTable)
                    .values({
                        commentId: comment.commentId,
                        learningMaterialId: learningMaterialId,
                    });

                // Get full comment with sender info
                const fullComment = await commentRepo.getCommentById(comment.commentId, tx);
                if (!fullComment) {
                    throw new DatabaseError('Failed to retrieve created comment');
                }

                return this.mapCommentToIComment(fullComment);
            } catch (err) {
                if (err instanceof DatabaseError || err instanceof NotFoundError || err instanceof BadRequest) throw err;
                throw new DatabaseError('Failed to create comment');
            }
        });
    }

    public async updateComment(
        commentId: number,
        userId: number,
        data: IUpdateCommentBody
    ): Promise<IComment> {
        // Check if comment exists and user is the sender
        const existingComment = await commentRepo.getCommentById(commentId);
        if (!existingComment) {
            throw new NotFoundError('Comment not found');
        }

        if (existingComment.senderId !== userId) {
            throw new Forbidden('You can only update your own comments');
        }

        // Update comment
        const updateData: IUpdateCommentRepo = {
            content: data.content,
        };
        await commentRepo.updateComment(commentId, updateData);

        // Get updated comment
        const updatedComment = await commentRepo.getCommentById(commentId);
        if (!updatedComment) {
            throw new DatabaseError('Failed to retrieve updated comment');
        }

        return this.mapCommentToIComment(updatedComment);
    }

    public async getCommentsBySubmissionId(
        submissionId: number,
        page: number = 1,
        limit: number = 20
    ): Promise<IComment[]> {
        const offset = (page - 1) * limit;
        const results = await commentRepo.getCommentsBySubmissionId(submissionId, limit, offset);
        
        // Attach replies to each comment
        const comments = await Promise.all(
            results.map(async (result) => {
                const comment = this.mapCommentToIComment(result);
                await this.attachReplies(comment);
                return comment;
            })
        );
        
        return comments;
    }

    public async createCommentForSubmission(
        submissionId: number,
        userId: number,
        data: ICreateCommentBody
    ): Promise<IComment> {
        return await db.transaction(async (tx) => {
            try {
                // Get assignmentId from submission
                const { assignmentSubmissionsTable } = await import('@/models/class-based-learning/assignment/assignmentSubmission.model');
                const [submission] = await tx
                    .select({ assignmentId: assignmentSubmissionsTable.assignmentId })
                    .from(assignmentSubmissionsTable)
                    .where(eq(assignmentSubmissionsTable.submissionId, submissionId))
                    .limit(1);

                if (!submission) {
                    throw new NotFoundError('Submission not found');
                }

                // If this is a reply, validate parent comment
                if (data.parentCommentId) {
                    const parentComment = await commentRepo.getCommentById(data.parentCommentId, tx);
                    if (!parentComment) {
                        throw new NotFoundError('Parent comment not found');
                    }
                    
                    // Verify parent comment belongs to the same submission (private comments)
                    const [parentSubmissionComment] = await tx
                        .select()
                        .from(assignmentCommentsTable)
                        .where(
                            and(
                                eq(assignmentCommentsTable.commentId, data.parentCommentId),
                                eq(assignmentCommentsTable.assignmentId, submission.assignmentId),
                                eq(assignmentCommentsTable.submissionId, submissionId) // Must be a private comment for this submission
                            )
                        )
                        .limit(1);
                    
                    if (!parentSubmissionComment) {
                        throw new BadRequest('Parent comment does not belong to this submission');
                    }
                    
                    // Allow infinite nested replies - no depth limit
                    // User can reply to their own comments to create infinite tree
                }

                // Create comment
                const createData: ICreateCommentRepo = {
                    senderId: userId,
                    content: data.content,
                    parentCommentId: data.parentCommentId ?? null,
                };
                const comment = await commentRepo.createComment(createData, tx);

                // Link comment to submission (private comment - with submissionId)
                await tx
                    .insert(assignmentCommentsTable)
                    .values({
                        commentId: comment.commentId,
                        assignmentId: submission.assignmentId,
                        submissionId: submissionId, // Private comment
                    });

                // Get full comment with sender info
                const fullComment = await commentRepo.getCommentById(comment.commentId, tx);
                if (!fullComment) {
                    throw new DatabaseError('Failed to retrieve created comment');
                }

                return this.mapCommentToIComment(fullComment);
            } catch (err) {
                if (err instanceof DatabaseError || err instanceof NotFoundError || err instanceof BadRequest) throw err;
                throw new DatabaseError('Failed to create comment');
            }
        });
    }

    public async deleteComment(commentId: number, userId: number): Promise<void> {
        // Check if comment exists and user is the sender
        const existingComment = await commentRepo.getCommentById(commentId);
        if (!existingComment) {
            throw new NotFoundError('Comment not found');
        }

        if (existingComment.senderId !== userId) {
            throw new Forbidden('You can only delete your own comments');
        }

        await commentRepo.deleteComment(commentId);
    }
}

export default new CommentService();

