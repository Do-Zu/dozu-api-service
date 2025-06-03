import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { quizzesTable } from '@/models/quiz/quiz.model';
import { questionsTable } from '@/models/quiz/question.model';

export const questionInQuizTable = pgTable(
  'question_in_quiz',
  {
    quizId: integer('quiz_id')
      .notNull()
      .references(() => quizzesTable.quizId, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => questionsTable.questionId, { onDelete: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.quizId, table.questionId] }),
  })
);
