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

export const itemSpacedRepetitionTrackingTable = pgTable(
  'item_spaced_repetition_tracking',
  {
    itemId: integer('item_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.userId, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'flashcard' or 'question'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    repetitionNumber: integer('repetition_number').default(0),
    easinessFactor: decimal('easiness_factor', { precision: 3, scale: 2 }).default('2.5'),
    interval: integer('interval').default(0),
    lastReviewed: date('last_reviewed'),
    nextReview: date('next_review'),
    status: varchar('status', { length: 10 }).default('new'), // 'new', 'learning', 'review'
  },
  table => ({
    pk: primaryKey({ columns: [table.itemId, table.userId, table.type] }),
  })
);
