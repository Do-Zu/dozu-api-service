import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { attachmentTable } from '@/models/attachment.model';
import { assignmentSubmissionsTable } from './assignmentSubmission.model';

export const assignmentSubmissionAttachmentsTable = pgTable(
    'assignment_submission_attachments',
    {
        attachmentId: integer('attachment_id')
            .notNull()
            .references(() => attachmentTable.attachmentId, { onDelete: 'cascade' }),
        assignmentSubmissionId: integer('assignment_submission_id')
            .notNull()
            .references(() => assignmentSubmissionsTable.submissionId, { onDelete: 'cascade' }),
    },
    table => ({
        pk: primaryKey({ columns: [table.attachmentId, table.assignmentSubmissionId] }),
    })
);

export type TypeSelectAssignmentSubmissionAttachments = typeof assignmentSubmissionAttachmentsTable.$inferSelect;
export type TypeInsertAssignmentSubmissionAttachments = typeof assignmentSubmissionAttachmentsTable.$inferInsert;
