import db from '@/libs/drizzleClient.lib';

import { Request, Response } from 'express';
import {
    IAssignment,
    IAssignmentWithAttachments,
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
import { BadRequest, InternalServerError, NotFoundError } from '@/core/error';
import { getCurrentDateInTimeZone } from '@/utils/date';
import { IAddedAttachment, inputResourcesSchema } from '@/types/class-based-learning/classwork/attachment.type';
import { attachmentService } from '@/services/class-based-learning/attachment/attachment.service';
import assignmentAttachmentService from './assignmentAttachment.service';
import { TypeSelectAttachment } from '@/models';
import { ReturnAttachment } from '@/types/class-based-learning/attachment/attachment.type';

const getBackendBaseUrl = (): string => {
    const backendBaseUrl = process.env.BACKEND_BASE_URL;

    if (!backendBaseUrl) {
        throw new Error('BACKEND_BASE_URL is missing');
    }

    return backendBaseUrl;
};

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
        const backendBaseUrl = getBackendBaseUrl();
        const classId = requestHelper.getIdParam(req, 'classId');
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const [assignment] = (await db
            .select()
            .from(assignmentsTable)
            .where(and(eq(assignmentsTable.assignmentId, assignmentId), eq(assignmentsTable.classId, classId)))
            .limit(1)) as (IAssignment | undefined)[];

        if (!assignment) {
            throw new NotFoundError('Assignment not found');
        }

        const attachments: TypeSelectAttachment[] = await assignmentAttachmentService.getAssignmentAttachmentsDetails({
            assignmentId,
        });

        const mapAttachment = (attachment: TypeSelectAttachment): ReturnAttachment => {
            let fileUrl: string | undefined = undefined;

            const metadata = attachment.metadata as unknown;
            if (metadata && typeof metadata === 'object' && 'fileKey' in metadata) {
                const fileKey = (metadata as any).fileKey;
                if (typeof fileKey === 'string' && fileKey.length > 0) {
                    fileUrl = `${backendBaseUrl}/api/upload/r2/${encodeURIComponent(fileKey)}`;
                }
            }

            return {
                ...attachment,
                fileUrl,
            } as ReturnAttachment;
        };

        const returnAttachments = attachments.map(mapAttachment);

        const result: IAssignmentWithAttachments = { assignment, attachments: returnAttachments };

        SuccessResponse.ok(res, result);
    }

    public async createAssignment(req: Request, res: Response) {
        const teacherId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');
        const data = req.body as InsertAssignmentBody;
        const value: InsertAssignment = { ...data, teacherId, classId };
        let addedAttachments: IAddedAttachment[] | undefined = undefined;

        // handle insert attachments from inputResources
        if (data.inputResources && data.inputResources.length > 0) {
            const inputResourcesParseResult = inputResourcesSchema.safeParse(data.inputResources);
            if (inputResourcesParseResult.error) {
                throw new BadRequest('Invalid attachment request');
            }
            const validAttachments = inputResourcesParseResult.data;
            addedAttachments = await attachmentService.handleInsertMultipleResources({
                inputResources: validAttachments,
            });
        }
        const assignmentParseResult = insertAssignmentSchema.safeParse(value);
        if (assignmentParseResult.error) {
            throw new BadRequest('Invalid request');
        }

        // handle insert assignments
        const [result] = (await db.insert(assignmentsTable).values(assignmentParseResult.data).returning()) as (
            | IAssignment
            | undefined
        )[];

        if (!result) {
            throw new InternalServerError('Cannot create assignment');
        }

        // handle link addedAttachments to assignments table
        if (addedAttachments) {
            await assignmentAttachmentService.linkAttachmentsToAssignment({
                assignmentId: result.assignmentId,
                attachments: addedAttachments,
            });
        }

        SuccessResponse.created(res, result);
    }

    public async updateAssignmentById(req: Request, res: Response) {
        const teacherId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');
        const data = req.body as IUpdateAssignmentBody;
        const currentDate = getCurrentDateInTimeZone();
        const value: IUpdateAssignment = { ...data, updatedAt: currentDate };
        let addedAttachments: IAddedAttachment[] | undefined = undefined;

        // handle insert attachments from inputResources
        if (data.inputResources && data.inputResources.length > 0) {
            const inputResourcesParseResult = inputResourcesSchema.safeParse(data.inputResources);
            if (inputResourcesParseResult.error) {
                throw new BadRequest('Invalid attachment request');
            }
            const validAttachments = inputResourcesParseResult.data;
            addedAttachments = await attachmentService.handleInsertMultipleResources({
                inputResources: validAttachments,
            });
        }

        const parseResult = updateAssignmentSchema.safeParse(value);
        if (!parseResult.success) {
            throw new BadRequest('Invalid request');
        }

        const [result] = (await db
            .update(assignmentsTable)
            .set(parseResult.data)
            .where(
                and(
                    eq(assignmentsTable.assignmentId, assignmentId),
                    eq(assignmentsTable.classId, classId),
                    eq(assignmentsTable.teacherId, teacherId)
                )
            )
            .returning()) as (IAssignment | undefined)[];

        if (!result) {
            throw new NotFoundError('Assignment not found');
        }

        // handle link addedAttachments to assignments table
        if (addedAttachments) {
            await assignmentAttachmentService.linkAttachmentsToAssignment({
                assignmentId: result.assignmentId,
                attachments: addedAttachments,
            });
        }

        SuccessResponse.ok(res, result);
    }

    public async deleteAssignmentById(req: Request, res: Response) {
        const teacherId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');
        const assignmentId = requestHelper.getIdParam(req, 'assignmentId');

        const [result] = (await db
            .delete(assignmentsTable)
            .where(
                and(
                    eq(assignmentsTable.assignmentId, assignmentId),
                    eq(assignmentsTable.classId, classId),
                    eq(assignmentsTable.teacherId, teacherId)
                )
            )
            .returning()) as (IAssignment | undefined)[];

        if (!result) {
            throw new NotFoundError('Assignment not found');
        }

        SuccessResponse.ok(res, result.assignmentId);
    }
}

export default new AssignmentController();
