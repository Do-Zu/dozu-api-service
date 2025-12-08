import { pgTable, integer, boolean, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { classQuizAttemptsTable } from "@/models";

export const classQuizAttemptAnswersTable = pgTable(
  "class_quiz_attempt_answers",
  {
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => classQuizAttemptsTable.attemptId, { onDelete: "cascade" }),

    snapshotQuestionIdx: integer("snapshot_question_idx").notNull(),

    userAnswerIndex: integer("user_answer_index"),
    correct: boolean("correct").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.attemptId, t.snapshotQuestionIdx] }),
    idxAttempt: index("idx_cqaa_attempt").on(t.attemptId),
  })
);

export type IClassQuizAttemptAnswer = typeof classQuizAttemptAnswersTable.$inferSelect;
export type IClassQuizAttemptAnswerInsert = typeof classQuizAttemptAnswersTable.$inferInsert;
