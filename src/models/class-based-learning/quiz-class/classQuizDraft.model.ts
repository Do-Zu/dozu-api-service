import { pgTable, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { usersTable, classQuizzesTable } from '@/models';

export const classQuizDraftsTable = pgTable('class_quiz_drafts', {
  classQuizId: integer('class_quiz_id')
    .primaryKey()
    .references(() => classQuizzesTable.classQuizId, { onDelete: 'cascade' }),

  teacherId: integer('teacher_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),

  // JSONB: { items:[{ id|null, text, choices[], correctIndex }], orderSeed, meta }
  draftJson: jsonb('draft_json').notNull(),

  version: integer('version').notNull().default(1),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  // Optional index to search drafts by teacher
  idxTeacher: index('idx_cqd_teacher').on(t.teacherId),
}));

export type IClassQuizDraft = typeof classQuizDraftsTable.$inferSelect;
export type IClassQuizDraftInsert = typeof classQuizDraftsTable.$inferInsert;
