import db from '@/libs/drizzleClient.lib';
import { assignmentAttachmentsTable, TypeInsertAssignmentAttachments, TypeSelectAssignmentAttachments } from '@/models';
import { IAddedAttachment } from '@/types/class-based-learning/classwork/attachment.type';

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
}

export default new AssignmentAttachmentService();
