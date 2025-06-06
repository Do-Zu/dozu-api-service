import {
  pgTable,
  integer,
  text,
  decimal,
  date,
  varchar,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';
import { topicsTable } from '../topic.model';

export const itemSpacedRepetitionTrackingTable = pgTable(
  'item_spaced_repetition_tracking',
  {
    itemId: integer('item_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.userId, { onDelete: 'cascade' }),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'flashcard' or 'question'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    repetitionNumber: integer('repetition_number').notNull().default(0),
    easinessFactor: decimal('easiness_factor', { precision: 3, scale: 2 }).notNull().default('2.5'),
    reviewInterval: integer('review_interval').notNull().default(0),
    lastReviewed: date('last_reviewed'),
    nextReview: date('next_review'),
    status: varchar('status', { length: 10 }).notNull().default('new'), // 'new', 'learning', 'review'
  },
  table => ({
    pk: primaryKey({ columns: [table.itemId, table.userId, table.type] }),
  })
);
