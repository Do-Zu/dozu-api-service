import db from '@/libs/drizzleClient.lib';
import requestHelper from '@/core/request/request.helper';
import { Request, Response } from 'express';
import { assignmentSubmissionsTable, usersTable } from '@/models';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { BadRequest, NotFoundError } from '@/core/error';
import {
    AssignmentSubmissionStatusEnum,
    IAssignmentSubmission,
    IAssignmentSubmissionStatus,
    IAssignmentSubmissionWithStudent,
    InsertAssignmentSubmission,
    InsertAssignmentSubmissionBody,
    IUpdateAssignmentSubmissionBody,
} from './assignmentSubmission.type';
import {
    gradeAssignmentSubmissionSchema,
    insertAssignmentSubmissionSchema,
    updateAssignmentSubmissionSchema,
} from './assignmentSubmission.schema';
import assignmentSubmissionService from './assignmentSubmission.service';

class AssignmentSubmissionController {
    // update, get from id
    public async getAssignmentSubmission(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        let [result]: IAssignmentSubmission[] = await db
            .select()
            .from(assignmentSubmissionsTable)
            .where(
                and(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    eq(assignmentSubmissionsTable.studentId, userId)
                )
            );

        // needed to be verified
        if (!result) {
            result = await assignmentSubmissionService.createDefaultAssignmentSubmission({
                assignmentId,
                studentId: userId,
            });
        }

        if (!result) {
            throw new NotFoundError('Submission not found');
        }

        SuccessResponse.ok(res, result);
    }

    // update: need to be used after teacher creates an assignment
    public async createAssignmentSubmission(req: Request, res: Response) {
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const submission = req.body as InsertAssignmentSubmissionBody;
        const data: InsertAssignmentSubmission = { ...submission, assignmentId };
        const parseResult = insertAssignmentSubmissionSchema.safeParse(data);
        if (parseResult.error) {
            throw new BadRequest('Invalid request');
        }

        const [result]: IAssignmentSubmission[] = await db
            .insert(assignmentSubmissionsTable)
            .values(parseResult.data)
            .returning();

        // handle files

        SuccessResponse.created(res, result);
    }

    public async updateAssignmentSubmissionById(req: Request, res: Response) {
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const submissionId = requestHelper.getIdParam(req, 'submissionId');
        const submission = req.body as IUpdateAssignmentSubmissionBody;
        const { status } = submission;

        const parseResult = updateAssignmentSubmissionSchema.safeParse({ status });
        if (parseResult.error) {
            throw new BadRequest('Invalid request');
        }

        const [result]: IAssignmentSubmission[] = await db
            .update(assignmentSubmissionsTable)
            .set(parseResult.data)
            .where(
                and(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    eq(assignmentSubmissionsTable.submissionId, submissionId)
                )
            )
            .returning();

        if (!result) {
            throw new NotFoundError('Submission not found');
        }

        SuccessResponse.ok(res, result);
    }

    // assume every students have a submission when teacher creates an assignment
    public async getAssignmentSubmissionsOfStudents(req: Request, res: Response) {
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');

        const submissions: IAssignmentSubmissionWithStudent[] = await db
            .select({
                student: { userId: usersTable.userId, fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl },
                submission: { ...getTableColumns(assignmentSubmissionsTable) },
            })
            .from(assignmentSubmissionsTable)
            .innerJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.userId))
            .where(eq(assignmentSubmissionsTable.assignmentId, assignmentId));

        SuccessResponse.ok(res, submissions);
    }

    // middleware for validating teacher grading submission
    public async gradeAssignmentSubmission(req: Request, res: Response) {
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const submissionId = requestHelper.getIdParam(req, 'submissionId');

        const { grade } = req.body as { grade: number };

        const parseResult = gradeAssignmentSubmissionSchema.safeParse({ grade });
        if (parseResult.error) {
            throw new BadRequest('Invalid grade');
        }

        const status = AssignmentSubmissionStatusEnum.RETURNED;
        const data: { grade: number; status: IAssignmentSubmissionStatus } = { grade, status };
        const [result] = await db
            .update(assignmentSubmissionsTable)
            .set(data)
            .where(
                and(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    eq(assignmentSubmissionsTable.submissionId, submissionId)
                )
            )
            .returning();

        if (!result) {
            throw new NotFoundError('Submission not found');
        }

        SuccessResponse.ok(res, result);
    }
}

export default new AssignmentSubmissionController();
