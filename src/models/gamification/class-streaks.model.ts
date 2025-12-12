import { pgTable, serial, integer, timestamp, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';
import { classesTable } from '@/models/class-based-learning/class.model';

// Class streaks table - stores streak data per user per class
export const classStreaksTable = pgTable('class_streaks', {
  classStreakId: serial('class_streak_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => classesTable.classId, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastStudyDate: timestamp('last_study_date', { withTimezone: true }),
  streakFreezeUsed: boolean('streak_freeze_used').default(false),
  streakFreezeCount: integer('streak_freeze_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  // Unique constraint: one streak record per user per class
  ux_user_class: uniqueIndex('ux_class_streak_user_class').on(t.userId, t.classId),
}));

export type ClassStreak = typeof classStreaksTable.$inferSelect;
export type ClassStreakInsert = typeof classStreaksTable.$inferInsert;

