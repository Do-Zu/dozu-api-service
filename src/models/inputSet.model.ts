import { pgTable, serial, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';
import { topicsTable } from '@/models/topic.model';

export const inputSets = pgTable('input_set', {
  setId: serial('set_id').primaryKey(),

  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),

  topicId: integer('topic_id').references(() => topicsTable.topicId, { onDelete: 'cascade' }),

  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  contentType: varchar('content_type', { length: 50 }),
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
