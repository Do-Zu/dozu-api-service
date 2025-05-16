import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  decimal,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic.model'; // adjust path as needed

export const flashcardsTable = pgTable('flashcards', {
  flashcardId: serial('flashcard_id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),

  repetitionNumber: integer('repetition_number').notNull().default(0),
  easinessFactor: decimal('easiness_factor', { precision: 3, scale: 2 }).notNull().default('2.5'),
  reviewInterval: integer('review_interval').notNull().default(0),
  lastReviewed: date('last_reviewed'),
  nextReview: date('next_review'),
  status: varchar('status', { length: 10 }).notNull().default('new'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
