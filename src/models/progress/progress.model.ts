import {
  pgTable,
  varchar,
  integer,
  timestamp,
  doublePrecision,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';


export const contentTypeEnum = pgEnum('content_type', [
  'course',
  'lesson',
  'quiz',
  'flashcard',
  'video',
  'article',
]);

export const progressStatusEnum = pgEnum('progress_status', [
  'not_started',
  'in_progress',
  'completed',
  'failed',
]);


export const progressTable = pgTable('progress', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  contentId: varchar('content_id', { length: 100 }).notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
});

// Export types
export type Progress = typeof progressTable.$inferSelect;
export type ProgressInsert = typeof progressTable.$inferInsert;
