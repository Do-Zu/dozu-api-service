import { Request, Response } from 'express';
import db from '@/libs/drizzleClient.lib';
import { teacherRequestsTable, usersTable } from '@/models';
import { desc, eq } from 'drizzle-orm';
import { SuccessResponse } from '@/core/success';
import { ISendRequestBody, ITeacherRequest } from '@/types/teacher-request/teacherRequest.type';
import { BadRequest } from '@/core/error';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { addRoleTeacherForAccount } from '@/services/auth.service';
import requestHelper from '@/core/request/request.helper';

class TeacherRequestController {
    public async getAllRequests(req: Request, res: Response) {
        const result: ITeacherRequest[] = await db
            .select({
                requestId: teacherRequestsTable.requestId,
                userId: teacherRequestsTable.userId,
                description: teacherRequestsTable.description,
                status: teacherRequestsTable.status,
                createdAt: teacherRequestsTable.createdAt,
                userInfo: {
                    userId: usersTable.userId,
                    username: usersTable.username,
                    fullName: usersTable.fullName,
                    avatarUrl: usersTable.avatarUrl,
                },
            })
            .from(teacherRequestsTable)
            .innerJoin(usersTable, eq(teacherRequestsTable.userId, usersTable.userId));

        SuccessResponse.ok(res, result);
    }

    public async getPendingRequests(req: Request, res: Response) {
        const result: ITeacherRequest[] = await db
            .select({
                requestId: teacherRequestsTable.requestId,
                userId: teacherRequestsTable.userId,
                description: teacherRequestsTable.description,
                status: teacherRequestsTable.status,
                createdAt: teacherRequestsTable.createdAt,
                userInfo: {
                    userId: usersTable.userId,
                    username: usersTable.username,
                    fullName: usersTable.fullName,
                    avatarUrl: usersTable.avatarUrl,
                },
            })
            .from(teacherRequestsTable)
            .innerJoin(usersTable, eq(teacherRequestsTable.userId, usersTable.userId))
            .where(eq(teacherRequestsTable.status, 'pending'));

        SuccessResponse.ok(res, result);
    }

    public async getRequest(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);

        const [result] = await db
            .select({
                requestId: teacherRequestsTable.requestId,
                userId: teacherRequestsTable.userId,
                description: teacherRequestsTable.description,
                status: teacherRequestsTable.status,
                createdAt: teacherRequestsTable.createdAt,
            })
            .from(teacherRequestsTable)
            .where(eq(teacherRequestsTable.userId, userId))
            .orderBy(desc(teacherRequestsTable.createdAt))
            .limit(1);

        SuccessResponse.ok(res, result);
    }

    public async sendRequest(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const { description } = req.body as ISendRequestBody;
        if (!description) {
            throw new BadRequest('description is required');
        }

        const data = { userId, description };
        const [result] = await db.insert(teacherRequestsTable).values(data).returning({
            requestId: teacherRequestsTable.requestId,
            userId: teacherRequestsTable.userId,
            description: teacherRequestsTable.description,
            status: teacherRequestsTable.status,
            createdAt: teacherRequestsTable.createdAt,
        });

        SuccessResponse.created(res, result);
    }

    public async approveRequest(req: Request, res: Response) {
        const requestId = requestHelper.getIdParam(req, 'requestId');

        const [result]: ITeacherRequest[] = await db
            .update(teacherRequestsTable)
            .set({ status: 'approved' })
            .where(eq(teacherRequestsTable.requestId, requestId))
            .returning({
                requestId: teacherRequestsTable.requestId,
                userId: teacherRequestsTable.userId,
                description: teacherRequestsTable.description,
                status: teacherRequestsTable.status,
                createdAt: teacherRequestsTable.createdAt,
            });

        if (!result) {
            throw new BadRequest('Teacher Request Not Found!');
        }

        await addRoleTeacherForAccount(result.userId);

        SuccessResponse.ok(res, result);
    }

    public async rejectRequest(req: Request, res: Response) {
        const requestId = requestHelper.getIdParam(req, 'requestId');

        const [result]: ITeacherRequest[] = await db
            .update(teacherRequestsTable)
            .set({ status: 'rejected' })
            .where(eq(teacherRequestsTable.requestId, requestId))
            .returning({
                requestId: teacherRequestsTable.requestId,
                userId: teacherRequestsTable.userId,
                description: teacherRequestsTable.description,
                status: teacherRequestsTable.status,
                createdAt: teacherRequestsTable.createdAt,
            });

        if (!result) {
            throw new BadRequest('Teacher Request Not Found!');
        }

        SuccessResponse.ok(res, result);
    }
}

export default new TeacherRequestController();
