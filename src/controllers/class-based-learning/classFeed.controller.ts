import requestHelper from '@/core/request/request.helper';
import { Request, Response } from 'express';
import db from '@/libs/drizzleClient.lib';
import { classFeedsTable, IClassFeedType } from '@/models/class-based-learning/classFeed.model';
import { and, desc, eq } from 'drizzle-orm';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { usersTable } from '@/models';
import { IClassFeed, ICreateClassFeedBody, IUpdateClassFeedBody } from '@/types/class-based-learning/classFeed.type';
import { getSystemDate } from '@/utils/date';

class ClassFeedController {
    // create feed with type 'annoucement'
    public async createGeneralFeed(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const userId = getUserIdFromRequest(req);
        const { title, content, link } = req.body as ICreateClassFeedBody;
        const data = {
            classId,
            senderId: userId,
            type: 'announcement' as IClassFeedType,
            title,
            content,
            link,
        };
        if (!link) {
            delete data['link'];
        }
        const [feedCreated]: IClassFeed[] = await db.insert(classFeedsTable).values(data).returning();
        SuccessResponse.created(res, feedCreated);
    }

    public async updateFeed(req: Request, res: Response) {
        const feedId = requestHelper.getIdParam(req, 'feedId');
        const { title, content, link } = req.body as IUpdateClassFeedBody;
        const data = { title, content, link, updatedAt: getSystemDate() };
        if (!link) {
            delete data['link'];
        }
        const [feedUpdated]: IClassFeed[] = await db
            .update(classFeedsTable)
            .set(data)
            .where(eq(classFeedsTable.classFeedId, feedId))
            .returning();

        SuccessResponse.ok(res, feedUpdated);
    }

    public async deleteFeed(req: Request, res: Response) {
        const feedId = requestHelper.getIdParam(req, 'feedId');
        await db.delete(classFeedsTable).where(eq(classFeedsTable.classFeedId, feedId));
        SuccessResponse.ok(res, feedId);
    }

    public async getFeedsInClass(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const feeds: IClassFeed[] = await db
            .select({
                classFeedId: classFeedsTable.classFeedId,
                classId: classFeedsTable.classId,
                senderId: classFeedsTable.senderId,
                type: classFeedsTable.type,
                title: classFeedsTable.title,
                content: classFeedsTable.content,
                link: classFeedsTable.link,
                createdAt: classFeedsTable.createdAt,
                updatedAt: classFeedsTable.updatedAt,

                sender: {
                    avatarUrl: usersTable.avatarUrl,
                    fullName: usersTable.fullName,
                },
            })
            .from(classFeedsTable)
            .innerJoin(usersTable, eq(classFeedsTable.senderId, usersTable.userId))
            .where(eq(classFeedsTable.classId, classId))
            .orderBy(desc(classFeedsTable.createdAt));

        SuccessResponse.ok(res, feeds);
    }

    public async getFeedsInClassForTeacher(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const userId = getUserIdFromRequest(req);

        const feeds: IClassFeed[] = await db
            .select({
                classFeedId: classFeedsTable.classFeedId,
                classId: classFeedsTable.classId,
                senderId: classFeedsTable.senderId,
                type: classFeedsTable.type,
                title: classFeedsTable.title,
                content: classFeedsTable.content,
                link: classFeedsTable.link,
                createdAt: classFeedsTable.createdAt,
                updatedAt: classFeedsTable.updatedAt,
            })
            .from(classFeedsTable)
            .where(and(eq(classFeedsTable.classId, classId), eq(classFeedsTable.senderId, userId)))
            .orderBy(desc(classFeedsTable.createdAt));

        SuccessResponse.ok(res, feeds);
    }
}

export default new ClassFeedController();
