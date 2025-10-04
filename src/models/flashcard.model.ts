import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic.model';

export const flashcardsTable = pgTable('flashcards', {
  flashcardId: serial('flashcard_id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  nodeId: text('node_id'),

  front: text('front').notNull(),
  back: text('back').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
