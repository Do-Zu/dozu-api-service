import { integer, pgTable, serial } from 'drizzle-orm/pg-core';
import { commentsTable } from '@/models/comment/comment.model';
import { assignmentsTable } from './assignment.model';
import { assignmentSubmissionsTable } from './assignmentSubmission.model';

/**
 * AssignmentComment table - for comments on assignments and submissions
 * - If submissionId is null: public comment on assignment (visible to everyone in the class)
 * - If submissionId is not null: private comment on submission (visible only to teacher and student)
 */
export const assignmentCommentsTable = pgTable('assignment_comments', {
    assignmentCommentId: serial('assignment_comment_id').primaryKey(),
    commentId: integer('comment_id')
        .notNull()
        .references(() => commentsTable.commentId, { onDelete: 'cascade' }),
    assignmentId: integer('assignment_id')
        .notNull()
        .references(() => assignmentsTable.assignmentId, { onDelete: 'cascade' }),
    submissionId: integer('submission_id')
        .references(() => assignmentSubmissionsTable.submissionId, { onDelete: 'cascade' }),
});

export type TypeSelectAssignmentComment = typeof assignmentCommentsTable.$inferSelect;
export type TypeInsertAssignmentComment = typeof assignmentCommentsTable.$inferInsert;
