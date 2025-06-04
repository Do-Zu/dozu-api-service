import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic.model';
import { create } from 'domain';

export const questionsTable = pgTable('questions', {
  questionId: serial('question_id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  choices: text('choices').array(),
  correctIndex: integer('correct_index'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
