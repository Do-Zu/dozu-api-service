import { pgTable, integer, serial, text,varchar, timestamp } from "drizzle-orm/pg-core";
import { classQuizzesTable } from "@/models";

export const classQuizVersionsTable = pgTable('class_quiz_versions', {
  classQuizVersionId: serial('class_quiz_version_id').primaryKey(),
  classQuizId: integer('class_quiz_id').notNull().references(() => classQuizzesTable.classQuizId, { onDelete: 'cascade' }),

  // Save snapshot of question ID & order; can be JSON string (IDs + order + seed)
  questionsSnapshot: text('questions_snapshot').notNull(),   // JSON: { questionIds: number[], orderSeed: string, ... }
  choicesShuffleSeed: varchar('choices_shuffle_seed', { length: 64 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
