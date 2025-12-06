import { integer, pgTable, serial } from 'drizzle-orm/pg-core';
import { commentsTable } from '@/models/comment/comment.model';
import { assignmentsTable } from './assignment.model';

/**
 * AssignmentComment table - for public comments on assignments
 * This table links comments to assignments (visible to everyone in the class)
 * Private comments on submissions are handled separately (not implemented yet)
 */
export const assignmentCommentsTable = pgTable('assignment_comments', {
    assignmentCommentId: serial('assignment_comment_id').primaryKey(),
    commentId: integer('comment_id')
        .notNull()
        .references(() => commentsTable.commentId, { onDelete: 'cascade' }),
    assignmentId: integer('assignment_id')
        .notNull()
        .references(() => assignmentsTable.assignmentId, { onDelete: 'cascade' }),
});

export type TypeSelectAssignmentComment = typeof assignmentCommentsTable.$inferSelect;
export type TypeInsertAssignmentComment = typeof assignmentCommentsTable.$inferInsert;
