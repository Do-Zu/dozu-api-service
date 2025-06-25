import {
  pgTable,
  varchar,
  integer,
  timestamp,
  doublePrecision,
  pgEnum,
  jsonb,
  serial,
} from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';
import { topicsTable } from '../topic.model';
// import { quizzesTable } from '../quiz/quiz.model';
// import { flashcardsTable } from '../flashcard/flashcard.model';
// import { videosTable } from '../video/video.model';
// import { notesTable } from '../note/note.model';


export const contentTypeEnum = pgEnum('content_type', [
  'topic',
  'quiz',
  'flashcard',
  // 'note',
  // 'video',
]);

export const progressStatusEnum = pgEnum('progress_status', [
  'not_started',
  'in_progress',
  'completed',
  'failed',
]);


export const progressTable = pgTable('progress', {
  progressId: serial('progress_id').primaryKey(),
  userId: integer('user_id')
          .notNull()
          .references(() => usersTable.userId, { onDelete: 'cascade' }),
  topicId: integer('topic_id')
  .notNull()
  .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  contentType: contentTypeEnum('content_type').notNull(),
  completionPercentage: integer('completion_percentage').notNull().default(0),
  status: progressStatusEnum('status').notNull(),
  score: doublePrecision('score'),
  metadata: jsonb('metadata').$type<{
    attempts?: number;
    timeSpent?: number;
    lastPosition?: number;
    answers?: Record<string, any>;
    notes?: string;
  }>(),

  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: false }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Export types
export type Progress = typeof progressTable.$inferSelect;
export type ProgressInsert = typeof progressTable.$inferInsert;
