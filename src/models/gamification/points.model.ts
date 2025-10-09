import { pgTable, serial, integer, varchar, timestamp, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';

// Points table
export const pointsTable = pgTable('points', {
  pointsId: serial('points_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  totalPoints: integer('total_points').notNull().default(0),
  availablePoints: integer('available_points').notNull().default(0),
  lifetimePoints: integer('lifetime_points').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  ux_user: uniqueIndex('ux_points_user_id').on(t.userId),
}));

// Point transaction history
export const pointTransactionTable = pgTable('point_transactions', {
  transactionId: serial('transaction_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  points: integer('points').notNull(), // Can be positive (earned) or negative (spent)
  type: varchar('type', { length: 50 }).notNull(), // 'lesson_completed', 'streak_maintained', 'quiz_high_score', 'purchase', etc.
  description: text('description'),
  relatedId: integer('related_id'), // ID of related entity (lesson, quiz, etc.)
  relatedType: varchar('related_type', { length: 50 }), // 'lesson', 'quiz', 'topic', etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Export types
export type Points = typeof pointsTable.$inferSelect;
export type PointsInsert = typeof pointsTable.$inferInsert;
export type PointTransaction = typeof pointTransactionTable.$inferSelect;
export type PointTransactionInsert = typeof pointTransactionTable.$inferInsert;

// Point earning rules
export const POINT_RULES = {
  LESSON_COMPLETED: 10,
  STREAK_MAINTAINED: 5,
  QUIZ_HIGH_SCORE: 20,
  QUIZ_PERFECT_SCORE: 30,
  TOPIC_COMPLETED: 25,
  DAILY_GOAL_REACHED: 15,
  FLASHCARD_REVIEW: 2,
  QUIZ_COMPLETED: 5,
} as const;

// Streak bonus calculation
export const STREAK_BONUS = {
  WEEKLY_BONUS: 5, // Extra points per week of streak
  MONTHLY_BONUS: 20, // Extra points per month of streak
} as const;
