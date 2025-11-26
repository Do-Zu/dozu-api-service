import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic/topic.model';

export const questionsTable = pgTable('questions', {
    questionId: serial('question_id').primaryKey(),
    topicId: integer('topic_id')
        .notNull()
        .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull().default(''),
    choices: text('choices').array(),
    correctIndex: integer('correct_index'),
    questionType: text('question_type'),
    explain: text('explain'),
    hint: text('hint'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
