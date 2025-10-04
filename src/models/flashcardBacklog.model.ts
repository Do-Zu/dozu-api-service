import {
  pgTable, serial, integer, timestamp, pgEnum, varchar
} from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';
import { topicsTable } from '@/models/topic.model';
import { flashcardsTable } from '@/models/flashcard.model';

export const backlogSourceEnum = pgEnum('backlog_source', [
  'first_half',     // Later @50%
  'second_half',    // Later @100%
  'manual',         
  'backlog_quiz'    
]);

export const backlogStatusEnum = pgEnum('backlog_status', [
  'active',     // waiting
  'reserved',   // issued 
  'consumed',   // quiz completed
]);

export const flashcardBacklogItemsTable = pgTable('flashcard_backlog_items', {
  id: serial('id').primaryKey(),

  userId: integer('user_id').notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  topicId: integer('topic_id').notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  flashcardId: integer('flashcard_id').notNull()
    .references(() => flashcardsTable.flashcardId, { onDelete: 'cascade' }),

  source: backlogSourceEnum('source').notNull(),
  status: backlogStatusEnum('status').notNull().default('active'),

  sessionEpoch: integer('session_epoch'),
  orderIndex: integer('order_index'),
  clientRequestId: varchar('client_request_id', { length: 64 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  reservedAt: timestamp('reserved_at', { withTimezone: true }),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});
