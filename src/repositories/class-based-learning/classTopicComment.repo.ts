import db from '@/libs/drizzleClient.lib';
import { classTopicCommentsTable } from '@/models';
import {
    ICreateCommentService,
    IUpdateCommentService,
} from '@/services/class-based-learning/classTopicComment.service';
import { IClassTopicComment, IGetCommentsQuery } from '@/types/class-based-learning/classTopicComment.type';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

export type ICreateCommentRepo = ICreateCommentService & {
    topicId: number | null;
    author: { user_id: number; name: string; avatar?: string };
    level: number;
};

export type IUpdateCommentRepo = IUpdateCommentService;

type DBExecutor = typeof db;

class ClassTopicCommentRepo {
    public async getCommentById(commentId: number, executor: DBExecutor = db): Promise<IClassTopicComment | undefined> {
        const [result] = await executor
            .select()
            .from(classTopicCommentsTable)
            .where(and(eq(classTopicCommentsTable.commentId, commentId), eq(classTopicCommentsTable.isDeleted, false)));
        return result;
    }

    public async getCommentsByFilters(
        filters: IGetCommentsQuery,
        executor: DBExecutor = db
    ): Promise<IClassTopicComment[]> {
        const conditions = [eq(classTopicCommentsTable.isDeleted, false)];

        if (filters.nodeId) {
            conditions.push(eq(classTopicCommentsTable.nodeId, filters.nodeId));
        }

        if (filters.typeNode) {
            conditions.push(eq(classTopicCommentsTable.typeNode, filters.typeNode));
        }

        if (!filters?.parentCmtId) {
            conditions.push(isNull(classTopicCommentsTable.parentCmtId));
        } else {
            conditions.push(eq(classTopicCommentsTable.parentCmtId, filters.parentCmtId));
        }

        const result = await executor
            .select()
            .from(classTopicCommentsTable)
            .where(and(...conditions))
            // .orderBy(desc(classTopicCommentsTable.createdAt))
            .limit(filters.limit || 20)
            .offset(((filters.page || 1) - 1) * (filters.limit || 20));

        return result;
    }

    public async getRootCommentsByNode(
        nodeId: number | string,
        typeNode: string,
        executor: DBExecutor = db
    ): Promise<IClassTopicComment[]> {
        const result = await executor
            .select()
            .from(classTopicCommentsTable)
            .where(
                and(
                    eq(classTopicCommentsTable.nodeId, nodeId as string),
                    eq(classTopicCommentsTable.typeNode, typeNode),
                    isNull(classTopicCommentsTable.parentCmtId),
                    eq(classTopicCommentsTable.isDeleted, false)
                )
            );
        // .orderBy(desc(classTopicCommentsTable.createdAt));

        return result;
    }

    public async getRepliesByParentId(parentCmtId: number, executor: DBExecutor = db): Promise<IClassTopicComment[]> {
        const result = await executor
            .select()
            .from(classTopicCommentsTable)
            .where(
                and(eq(classTopicCommentsTable.parentCmtId, parentCmtId), eq(classTopicCommentsTable.isDeleted, false))
            )
            .orderBy(classTopicCommentsTable.createdAt);

        return result;
    }

    public async createComment(data: ICreateCommentRepo, executor: DBExecutor = db): Promise<IClassTopicComment> {
        const [result] = await executor.insert(classTopicCommentsTable).values(data).returning();

        return result;
    }

    public async updateComment(
        commentId: number,
        data: IUpdateCommentRepo,
        executor: DBExecutor = db
    ): Promise<IClassTopicComment> {
        const [result] = await executor
            .update(classTopicCommentsTable)
            .set({ ...data, updatedAt: sql`NOW()` })
            .where(eq(classTopicCommentsTable.commentId, commentId))
            .returning();

        return result;
    }

    public async softDeleteComment(commentId: number, executor: DBExecutor = db): Promise<void> {
        await executor
            .update(classTopicCommentsTable)
            .set({
                isDeleted: true,
                updatedAt: sql`NOW()`,
            })
            .where(eq(classTopicCommentsTable.commentId, commentId));
    }

    public async incrementReplyCount(commentId: number, executor: DBExecutor = db): Promise<void> {
        await executor
            .update(classTopicCommentsTable)
            .set({
                replyCount: sql`${classTopicCommentsTable.replyCount} + 1`,
                updatedAt: sql`NOW()`,
            })
            .where(eq(classTopicCommentsTable.commentId, commentId));
    }

    public async decrementReplyCount(commentId: number, executor: DBExecutor = db): Promise<void> {
        await executor
            .update(classTopicCommentsTable)
            .set({
                replyCount: sql`${classTopicCommentsTable.replyCount} - 1`,
                updatedAt: sql`NOW()`,
            })
            .where(eq(classTopicCommentsTable.commentId, commentId));
    }

    public async updateReactionCount(commentId: number, count: number, executor: DBExecutor = db): Promise<void> {
        await executor
            .update(classTopicCommentsTable)
            .set({
                reactionCount: count,
                updatedAt: sql`NOW()`,
            })
            .where(eq(classTopicCommentsTable.commentId, commentId));
    }

    public async getCommentsByAuthor(authorUserId: number, executor: DBExecutor = db): Promise<IClassTopicComment[]> {
        const result = await executor
            .select()
            .from(classTopicCommentsTable)
            .where(
                and(
                    sql`${classTopicCommentsTable.author}->>'user_id' = ${authorUserId.toString()}`,
                    eq(classTopicCommentsTable.isDeleted, false)
                )
            )
            .orderBy(desc(classTopicCommentsTable.createdAt));

        return result;
    }
}

const classTopicCommentRepo = new ClassTopicCommentRepo();
export default classTopicCommentRepo;
