import { pgTable, serial, integer, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { usersTable, classesTable, topicsTable } from "@/models";
import { pgEnum } from "drizzle-orm/pg-core";

export const classQuizStatusEnum = pgEnum('class_quiz_status', ['draft','scheduled','published','closed']);

export const classQuizzesTable = pgTable('class_quizzes', {
  classQuizId: serial('class_quiz_id').primaryKey(),

  teacherId: integer('teacher_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => classesTable.classId, { onDelete: 'cascade' }),
  topicId: integer('topic_id').references(() => topicsTable.topicId, { onDelete: 'cascade' }), // nullable

  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull().default(''),

  // Hybrid window
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),

  // Rules
  maxAttempts: integer('max_attempts').notNull().default(1),
  shuffleQuestions: boolean('shuffle_questions').notNull().default(true),
  shuffleChoices: boolean('shuffle_choices').notNull().default(true),
  showScoreToStudent: boolean('show_score_to_student').notNull().default(true),
  acceptingSubmissions: boolean('accepting_submissions').notNull().default(true),

  status: classQuizStatusEnum('status').notNull().default('draft'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),

  autoPublishError: text('auto_publish_error'),
  autoPublishLastTriedAt: timestamp('auto_publish_last_tried_at', { withTimezone: true }),
});

export type IClassQuiz = typeof classQuizzesTable.$inferSelect;
export type IClassQuizInsert = typeof classQuizzesTable.$inferInsert;
