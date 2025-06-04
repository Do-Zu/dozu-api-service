import { pgTable, serial, integer, text } from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic.model';

export const quizzesTable = pgTable('quizzes', {
  quizId: serial('quiz_id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  name: text('name'),
  description: text('description'),
});
