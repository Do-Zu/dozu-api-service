import { pgTable, serial, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { quizzesTable } from '@/models/quiz/quiz.model';

export const quizResultTable = pgTable('quiz_result', {
  quizResultId: serial('quiz_result_id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzesTable.quizId, { onDelete: 'cascade' }),
  correctAnswersCount: integer('correct_answers_count'),
  questionsCount: integer('questions_count'),
  timeReviewed: timestamp('time_reviewed', { withTimezone: true }).defaultNow(),
});
