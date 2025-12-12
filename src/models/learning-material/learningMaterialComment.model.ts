import { integer, pgTable, serial } from 'drizzle-orm/pg-core';
import { commentsTable } from '@/models/comment/comment.model';
import { learningMaterialTable } from './learningMaterial.model';

/**
 * LearningMaterialComment table - for public comments on learning materials
 * This table links comments to learning materials (visible to everyone in the class)
 */
export const learningMaterialCommentsTable = pgTable('learning_material_comments', {
    learningMaterialCommentId: serial('learning_material_comment_id').primaryKey(),
    commentId: integer('comment_id')
        .notNull()
        .references(() => commentsTable.commentId, { onDelete: 'cascade' }),
    learningMaterialId: integer('learning_material_id')
        .notNull()
        .references(() => learningMaterialTable.learningMaterialId, { onDelete: 'cascade' }),
});

export type TypeSelectLearningMaterialComment = typeof learningMaterialCommentsTable.$inferSelect;
export type TypeInsertLearningMaterialComment = typeof learningMaterialCommentsTable.$inferInsert;

