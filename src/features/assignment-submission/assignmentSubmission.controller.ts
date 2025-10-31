import db from '@/libs/drizzleClient.lib';
import requestHelper from '@/core/request/request.helper';
import { Request, Response } from 'express';
import { assignmentSubmissionsTable, TypeSelectAttachment, usersTable } from '@/models';
import { and, eq, getTableColumns, isNull, or } from 'drizzle-orm';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { BadRequest, InternalServerError, NotFoundError } from '@/core/error';
import {
    AssignmentSubmissionStatusEnum,
    IAssignmentSubmission,
    IAssignmentSubmissionStatus,
    IAssignmentSubmissionWithAttachments,
    IAssignmentSubmissionWithStudent,
    IAssignmentSubmissionWithStudentDetails,
    InsertAssignmentSubmission,
    InsertAssignmentSubmissionBody,
    IUpdateAssignmentSubmissionBody,
} from './assignmentSubmission.type';
import {
    gradeAssignmentSubmissionSchema,
    insertAssignmentSubmissionSchema,
    updateAssignmentSubmissionSchema,
} from './assignmentSubmission.schema';
import { IAddedAttachment, inputResourcesSchema } from '@/types/class-based-learning/classwork/attachment.type';
import { attachmentService } from '@/services/class-based-learning/attachment/attachment.service';
import assignmentSubmissionAttachmentService from './assignmentSubmissionAttachment.service';

class AssignmentSubmissionController {
    public async getAssignmentSubmission(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        let [submission] = (await db
            .select()
            .from(assignmentSubmissionsTable)
            .where(
                and(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    eq(assignmentSubmissionsTable.studentId, userId)
                )
            )) as (IAssignmentSubmission | undefined)[];

        if (!submission) {
            throw new NotFoundError('Submission not found');
        }

        const attachments: TypeSelectAttachment[] =
            await assignmentSubmissionAttachmentService.getSubmissionAttachmentsDetails({
                submissionId: submission.submissionId,
            });

        const result: IAssignmentSubmissionWithAttachments = {
            assignmentSubmission: submission,
            attachments,
        };

        SuccessResponse.ok(res, result);
    }

    // need to create a middleware for verifying if student can create submission from that assignment
    public async createAssignmentSubmission(req: Request, res: Response) {
        const studentId = getUserIdFromRequest(req);
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const submission = req.body as InsertAssignmentSubmissionBody;
        const data: InsertAssignmentSubmission = { ...submission, studentId, assignmentId };
        const parseResult = insertAssignmentSubmissionSchema.safeParse(data);
        if (parseResult.error) {
            throw new BadRequest('Invalid request');
        }

        const [result] = (await db.insert(assignmentSubmissionsTable).values(parseResult.data).returning()) as (
            | IAssignmentSubmission
            | undefined
        )[];

        if (!result) {
            throw new InternalServerError('Cannot create submission');
        }

        SuccessResponse.created(res, result);
    }

    public async updateAssignmentSubmissionById(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const submissionId = requestHelper.getIdParam(req, 'submissionId');
        const submission = req.body as IUpdateAssignmentSubmissionBody;
        const { status } = submission;

        let addedAttachments: IAddedAttachment[] | undefined = undefined;

        // handle insert attachments from inputResources
        if (submission.inputResources && submission.inputResources.length > 0) {
            const inputResourcesParseResult = inputResourcesSchema.safeParse(submission.inputResources);
            if (inputResourcesParseResult.error) {
                throw new BadRequest('Invalid attachment request');
            }
            const validAttachments = inputResourcesParseResult.data;
            addedAttachments = await attachmentService.handleInsertMultipleResources({
                inputResources: validAttachments,
            });
        }

        const parseResult = updateAssignmentSubmissionSchema.safeParse({ status });
        if (parseResult.error) {
            throw new BadRequest('Invalid request');
        }

        const [updatedSubmission] = (await db
            .update(assignmentSubmissionsTable)
            .set(parseResult.data)
            .where(
                and(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    eq(assignmentSubmissionsTable.submissionId, submissionId),
                    eq(assignmentSubmissionsTable.studentId, userId)
                )
            )
            .returning()) as (IAssignmentSubmission | undefined)[];

        if (!updatedSubmission) {
            throw new NotFoundError('Submission not found');
        }

        if (addedAttachments) {
            await assignmentSubmissionAttachmentService.linkAttachmentsToSubmission({
                submissionId: updatedSubmission.submissionId,
                attachments: addedAttachments,
            });
        }

        const result: {
            updatedAssignmentSubmission: IAssignmentSubmission;
            addedAttachments: IAddedAttachment[];
        } = { updatedAssignmentSubmission: updatedSubmission, addedAttachments: addedAttachments ?? [] };

        SuccessResponse.ok(res, result);
    }

    // assume every students have a submission when teacher creates an assignment
    public async getAssignmentSubmissionsOfStudents(req: Request, res: Response) {
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const result: IAssignmentSubmissionWithStudentDetails[] = [];

        const studentSubmissions: IAssignmentSubmissionWithStudent[] = await db
            .select({
                student: {
                    userId: usersTable.userId,
                    fullName: usersTable.fullName,
                    avatarUrl: usersTable.avatarUrl,
                    email: usersTable.email,
                    username: usersTable.username,
                },
                submission: { ...getTableColumns(assignmentSubmissionsTable) },
            })
            .from(assignmentSubmissionsTable)
            .rightJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.userId))
            .where(
                or(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    isNull(assignmentSubmissionsTable.assignmentId)
                )
            );

        for (const studentSubmission of studentSubmissions) {
            let attachments = null;
            if (studentSubmission.submission) {
                attachments = await assignmentSubmissionAttachmentService.getSubmissionAttachmentsDetails({
                    submissionId: studentSubmission.submission.submissionId,
                });
            }

            result.push({
                ...studentSubmission,
                attachments,
            });
        }

        SuccessResponse.ok(res, result);
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
        const [result] = (await db
            .update(assignmentSubmissionsTable)
            .set(data)
            .where(
                and(
                    eq(assignmentSubmissionsTable.assignmentId, assignmentId),
                    eq(assignmentSubmissionsTable.submissionId, submissionId)
                )
            )
            .returning()) as (IAssignmentSubmission | undefined)[];

        if (!result) {
            throw new NotFoundError('Submission not found');
        }

        SuccessResponse.ok(res, result);
    }
}

export default new AssignmentSubmissionController();
