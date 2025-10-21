import db from '@/libs/drizzleClient.lib';

import { Request, Response } from 'express';
import { IAssignment, InsertAssignment, InsertAssignmentBody } from './assignment.type';
import { assignmentsTable } from '@/models/class-based-learning/assignment/assignment.model';
import { eq } from 'drizzle-orm';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import requestHelper from '@/core/request/request.helper';

class AssignmentController {
    public async getAssignmentsForClass(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const result: IAssignment[] = await db
            .select()
            .from(assignmentsTable)
            .where(eq(assignmentsTable.classId, classId));

        SuccessResponse.ok(res, result);
    }

    // public async getAssignmentsForTopic(req: Request, res: Response) {
    //     const topicId = 1;
    //     const result: IAssignment[] = await db
    //         .select()
    //         .from(assignmentsTable)
    //         .where(eq(assignmentsTable.topicId, topicId));

    //     SuccessResponse.ok(res, result);
    // }

    // public async createAssignmentForTopic(req: Request, res: Response) {
    //     const teacherId = getUserIdFromRequest(req);
    //     const classId = 1;
    //     const topicId = 1;
    //     const data = req.body as InsertAssignmentBody;
    //     const value: InsertAssignment = { ...data, teacherId, classId, topicId };

    //     const [result]: IAssignment[] = await db.insert(assignmentsTable).values(value).returning();

    //     SuccessResponse.created(res, result);
    // }
}

export default new AssignmentController();
