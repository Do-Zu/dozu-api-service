import { usersTable } from '@/models';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { assignmentSubmissionsTable } from './assignmentSubmission.model';
import { assignmentsTable } from './assignment.model';

export const assignmentCommentsTable = pgTable('assignment_comments', {
    commentId: serial('comment_id').primaryKey(),
    // assignmentId serves public comment feature, but is not planned to be implemented at the present
    assignmentId: integer('assignment_id').references(() => assignmentsTable.assignmentId, { onDelete: 'cascade' }),
    submissionId: integer('submission_id')
        .notNull()
        .references(() => assignmentSubmissionsTable.submissionId, { onDelete: 'cascade' }),
    senderId: integer('sender_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    content: text('content').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
});
