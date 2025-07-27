import { pgTable, serial, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { quizzesTable } from '@/models/quiz/quiz.model';
import { usersTable } from '@/models/user.model'; 

export const quizResultTable = pgTable('quiz_result', {
    quizResultId: serial('quiz_result_id').primaryKey(),
    quizId: integer('quiz_id')
        .notNull()
        .references(() => quizzesTable.quizId, { onDelete: 'cascade' }),
    userId: integer('user_id') 
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    correctAnswersCount: integer('correct_answers_count'),
    questionsCount: integer('questions_count'),
    timeReviewed: timestamp('time_reviewed', { withTimezone: true }).defaultNow(),
});
