import db from '@/libs/drizzleClient.lib';

import { Request, Response } from 'express';
import {
    IAssignment,
    InsertAssignment,
    InsertAssignmentBody,
    IUpdateAssignment,
    IUpdateAssignmentBody,
} from './assignment.type';
import { assignmentsTable } from '@/models/class-based-learning/assignment/assignment.model';
import { and, eq } from 'drizzle-orm';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import requestHelper from '@/core/request/request.helper';
import { insertAssignmentSchema, updateAssignmentSchema } from './assignment.schema';
import { BadRequest, NotFoundError } from '@/core/error';
import { getCurrentDateInTimeZone } from '@/utils/date';

class AssignmentController {
    public async getAssignmentsForClass(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const result: IAssignment[] = await db
            .select()
            .from(assignmentsTable)
            .where(eq(assignmentsTable.classId, classId));

        SuccessResponse.ok(res, result);
    }

    public async getAssignmentById(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const [result]: IAssignment[] = await db
            .select()
            .from(assignmentsTable)
            .where(and(eq(assignmentsTable.assignmentId, assignmentId), eq(assignmentsTable.classId, classId)))
            .limit(1);

        if (!result) {
            throw new NotFoundError('Assignment not found');
        }

        SuccessResponse.ok(res, result);
    }

    public async createAssignment(req: Request, res: Response) {
        const teacherId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');
        const data = req.body as InsertAssignmentBody;
        const value: InsertAssignment = { ...data, teacherId, classId };

        const parseResult = insertAssignmentSchema.safeParse(value);
        if (!parseResult.success) {
            throw new BadRequest('Invalid request');
        }

        const [result]: IAssignment[] = await db.insert(assignmentsTable).values(parseResult.data).returning();

        SuccessResponse.created(res, result);
    }

    public async updateAssignmentById(req: Request, res: Response) {
        const teacherId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const data = req.body as IUpdateAssignmentBody;
        const currentDate = getCurrentDateInTimeZone();
        const value: IUpdateAssignment = { ...data, updatedAt: currentDate };

        const parseResult = updateAssignmentSchema.safeParse(value);
        if (!parseResult.success) {
            throw new BadRequest('Invalid request');
        }

        const [result]: IAssignment[] = await db
            .update(assignmentsTable)
            .set(parseResult.data)
            .where(
                and(
                    eq(assignmentsTable.assignmentId, assignmentId),
                    eq(assignmentsTable.classId, classId),
                    eq(assignmentsTable.teacherId, teacherId)
                )
            )
            .returning();

        if (!result) {
            throw new NotFoundError('Assignment not found');
        }

        SuccessResponse.ok(res, result);
    }

    public async deleteAssignmentById(req: Request, res: Response) {
        const teacherId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');

        const [result]: IAssignment[] = await db
            .delete(assignmentsTable)
            .where(
                and(
                    eq(assignmentsTable.assignmentId, assignmentId),
                    eq(assignmentsTable.classId, classId),
                    eq(assignmentsTable.teacherId, teacherId)
                )
            )
            .returning();

        if (!result) {
            throw new NotFoundError('Assignment not found');
        }

        SuccessResponse.ok(res, result.assignmentId);
    }
}

export default new AssignmentController();
