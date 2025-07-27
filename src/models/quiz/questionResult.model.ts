import { pgTable, integer, boolean, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { quizzesTable } from './quiz.model';
import { questionsTable } from './question.model';
import { usersTable } from '../user.model';

export const questionResultTable = pgTable(
  'question_result',
  {
    quizId: integer('quiz_id')
      .notNull()
      .references(() => quizzesTable.quizId, { onDelete: 'cascade' }),

    questionId: integer('question_id')
      .notNull()
      .references(() => questionsTable.questionId, { onDelete: 'cascade' }),

    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.userId, { onDelete: 'cascade' }),

    correct: boolean('correct').notNull(),
    
    userAnswerIndex: integer('user_answer_index'),

    answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.quizId, table.questionId, table.userId] }),
  })
);
