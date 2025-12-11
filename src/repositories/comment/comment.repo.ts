import db, { type Database, type Transaction } from '@/libs/drizzleClient.lib';
import { commentsTable, usersTable } from '@/models';
import { assignmentCommentsTable } from '@/models/class-based-learning/assignment/assignmentComment.model';
import { learningMaterialCommentsTable } from '@/models/learning-material/learningMaterialComment.model';
import { and, desc, eq, isNull } from 'drizzle-orm';

type DBExecutor = Database | Transaction;

export interface ICreateCommentRepo {
    senderId: number;
    content: string;
    parentCommentId?: number | null;
}

export interface IUpdateCommentRepo {
    content: string;
}

class CommentRepo {
    /**
     * Helper: Get common comment select fields with sender information
     */
    private getCommentSelectFields() {
        return {
            commentId: commentsTable.commentId,
            senderId: commentsTable.senderId,
            content: commentsTable.content,
            parentCommentId: commentsTable.parentCommentId,
            createdAt: commentsTable.createdAt,
            updatedAt: commentsTable.updatedAt,
            sender: {
                userId: usersTable.userId,
                username: usersTable.username,
                fullName: usersTable.fullName,
                avatarUrl: usersTable.avatarUrl,
            },
        };
    }

    /**
     * Helper: Build base query with comment and user joins
     */
    private buildCommentQuery(executor: DBExecutor) {
        return executor
            .select(this.getCommentSelectFields())
            .from(commentsTable)
            .innerJoin(usersTable, eq(commentsTable.senderId, usersTable.userId));
    }

    public async getCommentById(commentId: number, executor: DBExecutor = db) {
        const [result] = await this.buildCommentQuery(executor)
            .where(eq(commentsTable.commentId, commentId));

        return result;
    }

    public async getCommentsByAssignmentId(
        assignmentId: number,
        limit: number = 20,
        offset: number = 0,
        executor: DBExecutor = db
    ) {
        const result = await executor
            .select(this.getCommentSelectFields())
            .from(assignmentCommentsTable)
            .innerJoin(commentsTable, eq(assignmentCommentsTable.commentId, commentsTable.commentId))
            .innerJoin(usersTable, eq(commentsTable.senderId, usersTable.userId))
            .where(
                and(
                    eq(assignmentCommentsTable.assignmentId, assignmentId),
                    isNull(assignmentCommentsTable.submissionId), // Only public comments (no submissionId)
                    isNull(commentsTable.parentCommentId) // Only top-level comments
                )
            )
            .orderBy(desc(commentsTable.createdAt))
            .limit(limit)
            .offset(offset);

        return result;
    }

    public async getCommentsByLearningMaterialId(
        learningMaterialId: number,
        limit: number = 20,
        offset: number = 0,
        executor: DBExecutor = db
    ) {
        const result = await executor
            .select(this.getCommentSelectFields())
            .from(learningMaterialCommentsTable)
            .innerJoin(commentsTable, eq(learningMaterialCommentsTable.commentId, commentsTable.commentId))
            .innerJoin(usersTable, eq(commentsTable.senderId, usersTable.userId))
            .where(
                and(
                    eq(learningMaterialCommentsTable.learningMaterialId, learningMaterialId),
                    isNull(commentsTable.parentCommentId) // Only top-level comments
                )
            )
            .orderBy(desc(commentsTable.createdAt))
            .limit(limit)
            .offset(offset);

        return result;
    }

    public async createComment(data: ICreateCommentRepo, executor: DBExecutor = db) {
        const [result] = await executor
            .insert(commentsTable)
            .values(data)
            .returning();

        return result;
    }

    public async updateComment(commentId: number, data: IUpdateCommentRepo, executor: DBExecutor = db) {
        const [result] = await executor
            .update(commentsTable)
            .set({
                content: data.content,
                updatedAt: new Date(),
            })
            .where(eq(commentsTable.commentId, commentId))
            .returning();

        return result;
    }

    public async getCommentsBySubmissionId(
        submissionId: number,
        limit: number = 20,
        offset: number = 0,
        executor: DBExecutor = db
    ) {
        const result = await executor
            .select(this.getCommentSelectFields())
            .from(assignmentCommentsTable)
            .innerJoin(commentsTable, eq(assignmentCommentsTable.commentId, commentsTable.commentId))
            .innerJoin(usersTable, eq(commentsTable.senderId, usersTable.userId))
            .where(
                and(
                    eq(assignmentCommentsTable.submissionId, submissionId), // Private comments (with submissionId)
                    isNull(commentsTable.parentCommentId) // Only top-level comments
                )
            )
            .orderBy(desc(commentsTable.createdAt))
            .limit(limit)
            .offset(offset);

        return result;
    }

    public async deleteComment(commentId: number, executor: DBExecutor = db) {
        await executor
            .delete(commentsTable)
            .where(eq(commentsTable.commentId, commentId));
    }

    public async getRepliesByCommentId(
        commentId: number,
        executor: DBExecutor = db
    ) {
        const result = await this.buildCommentQuery(executor)
            .where(eq(commentsTable.parentCommentId, commentId))
            .orderBy(desc(commentsTable.createdAt));

        return result;
    }
}

export default new CommentRepo();

