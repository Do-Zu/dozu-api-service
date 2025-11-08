import { pgTable, serial, integer, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { usersTable, classQuizzesTable, classQuizVersionsTable } from "@/models";
export const classQuizAttemptStatusEnum = pgEnum('class_quiz_attempt_status', [
  'in_progress','submitted','cancelled'
]);

export const classQuizAttemptsTable = pgTable('class_quiz_attempts', {
  attemptId: serial('attempt_id').primaryKey(),
  classQuizId: integer('class_quiz_id').notNull().references(() => classQuizzesTable.classQuizId, { onDelete: 'cascade' }),
  classQuizVersionId: integer('class_quiz_version_id').references(() => classQuizVersionsTable.classQuizVersionId, { onDelete: 'set null' }),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),

  attemptStartedAt: timestamp('attempt_started_at', { withTimezone: true }).notNull(),
  attemptEndAt: timestamp('attempt_end_at', { withTimezone: true }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),

  status: classQuizAttemptStatusEnum('status').notNull().default('in_progress'),
  score: integer('score'),
  correctCount: integer('correct_count'),
  questionsCount: integer('questions_count'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type IClassQuizAttempt = typeof classQuizAttemptsTable.$inferSelect;
export type IClassQuizAttemptInsert = typeof classQuizAttemptsTable.$inferInsert;
