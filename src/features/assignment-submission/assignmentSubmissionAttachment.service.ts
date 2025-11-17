import db from '@/libs/drizzleClient.lib';
import { attachmentTable, TypeSelectAttachment } from '@/models';
import {
    assignmentSubmissionAttachmentsTable,
    TypeInsertAssignmentSubmissionAttachments,
    TypeSelectAssignmentSubmissionAttachments,
} from '@/models/class-based-learning/assignment/assignmentSubmissionAttachments.model';
import { IAddedAttachment } from '@/types/class-based-learning/classwork/attachment.type';
import { eq, getTableColumns } from 'drizzle-orm';

class AssignmentSubmissionAttachmentService {
    public async linkAttachmentsToSubmission({
        submissionId,
        attachments,
    }: {
        submissionId: number;
        attachments: IAddedAttachment[];
    }) {
        const data: TypeInsertAssignmentSubmissionAttachments[] = attachments.map(attachment => ({
            assignmentSubmissionId: submissionId,
            attachmentId: attachment.attachmentId,
        }));
        const result: TypeSelectAssignmentSubmissionAttachments[] = await db
            .insert(assignmentSubmissionAttachmentsTable)
            .values(data)
            .returning();
        return result;
    }

    public async getSubmissionAttachmentsDetails({ submissionId }: { submissionId: number }) {
        const result: TypeSelectAttachment[] = await db
            .select({ ...getTableColumns(attachmentTable) })
            .from(attachmentTable)
            .innerJoin(
                assignmentSubmissionAttachmentsTable,
                eq(attachmentTable.attachmentId, assignmentSubmissionAttachmentsTable.attachmentId)
            )
            .where(eq(assignmentSubmissionAttachmentsTable.assignmentSubmissionId, submissionId));

        return result;
    }
}

export default new AssignmentSubmissionAttachmentService();
