import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { attachmentTable } from '@/models/attachment.model';
import { assignmentsTable } from './assignment.model';

export const assignmentAttachmentsTable = pgTable(
    'assignment_attachments',
    {
        attachmentId: integer('attachment_id')
            .notNull()
            .references(() => attachmentTable.attachmentId, { onDelete: 'cascade' }),
        assignmentId: integer('assignment_id')
            .notNull()
            .references(() => assignmentsTable.assignmentId, { onDelete: 'cascade' }),
    },
    table => ({
        pk: primaryKey({ columns: [table.attachmentId, table.assignmentId] }),
    })
);

export type TypeSelectAssignmentAttachments = typeof assignmentAttachmentsTable.$inferSelect;
export type TypeInsertAssignmentAttachments = typeof assignmentAttachmentsTable.$inferInsert; 