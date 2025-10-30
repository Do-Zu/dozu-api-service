import db from '@/libs/drizzleClient.lib';
import {
    assignmentAttachmentsTable,
    attachmentTable,
    TypeInsertAssignmentAttachments,
    TypeSelectAssignmentAttachments,
    TypeSelectAttachment,
} from '@/models';
import { IAddedAttachment } from '@/types/class-based-learning/classwork/attachment.type';
import { eq, getTableColumns } from 'drizzle-orm';

class AssignmentAttachmentService {
    public async linkAttachmentsToAssignment({
        assignmentId,
        attachments,
    }: {
        assignmentId: number;
        attachments: IAddedAttachment[];
    }) {
        const data: TypeInsertAssignmentAttachments[] = attachments.map(attachment => ({
            assignmentId,
            attachmentId: attachment.attachmentId,
        }));
        const result: TypeSelectAssignmentAttachments[] = await db
            .insert(assignmentAttachmentsTable)
            .values(data)
            .returning();
        return result;
    }

    public async getAssignmentAttachmentsDetails({ assignmentId }: { assignmentId: number }) {
        const result: TypeSelectAttachment[] = await db
            .select({ ...getTableColumns(attachmentTable) })
            .from(attachmentTable)
            .innerJoin(
                assignmentAttachmentsTable,
                eq(attachmentTable.attachmentId, assignmentAttachmentsTable.attachmentId)
            )
            .where(eq(assignmentAttachmentsTable.assignmentId, assignmentId));

        return result;
    }
}

export default new AssignmentAttachmentService();
