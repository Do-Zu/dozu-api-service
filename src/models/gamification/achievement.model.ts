import { pgTable, serial, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';

// Achievement definitions
export const achievementTable = pgTable('achievements', {
  achievementId: serial('achievement_id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 255 }),
  points: integer('points').notNull().default(0), // Points awarded for earning this achievement
  type: varchar('type', { length: 50 }).notNull(), // 'streak', 'points', 'lessons', 'quizzes'
  condition: text('condition').notNull(), // JSON string describing the condition
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// User achievements (earned achievements)
export const userAchievementTable = pgTable('user_achievements', {
  userAchievementId: serial('user_achievement_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  achievementId: integer('achievement_id').notNull().references(() => achievementTable.achievementId, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow(),
  progress: integer('progress').notNull().default(0), // For tracking progress towards achievement
});

export type Achievement = typeof achievementTable.$inferSelect;
export type AchievementInsert = typeof achievementTable.$inferInsert;
export type UserAchievement = typeof userAchievementTable.$inferSelect;
export type UserAchievementInsert = typeof userAchievementTable.$inferInsert;

// Default achievements
export const DEFAULT_ACHIEVEMENTS = [
  {
    name: 'First Steps',
    description: 'Complete your first lesson',
    type: 'lessons',
    condition: JSON.stringify({ lessons_completed: 1 }),
    points: 50,
  },
  {
    name: 'Streak Starter',
    description: 'Maintain a 3-day learning streak',
    type: 'streak',
    condition: JSON.stringify({ streak_days: 3 }),
    points: 30,
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    type: 'streak',
    condition: JSON.stringify({ streak_days: 7 }),
    points: 100,
  },
  {
    name: 'Month Master',
    description: 'Maintain a 30-day learning streak',
    type: 'streak',
    condition: JSON.stringify({ streak_days: 30 }),
    points: 500,
  },
  {
    name: 'Quiz Master',
    description: 'Score 100% on 5 quizzes',
    type: 'quizzes',
    condition: JSON.stringify({ perfect_quizzes: 5 }),
    points: 75,
  },
  {
    name: 'Point Collector',
    description: 'Earn 1000 total points',
    type: 'points',
    condition: JSON.stringify({ total_points: 1000 }),
    points: 200,
  },
  {
    name: 'Dedicated Learner',
    description: 'Complete 50 lessons',
    type: 'lessons',
    condition: JSON.stringify({ lessons_completed: 50 }),
    points: 300,
  },
  {
    name: 'Quiz Champion',
    description: 'Complete 25 quizzes',
    type: 'quizzes',
    condition: JSON.stringify({ quizzes_completed: 25 }),
    points: 150,
  },
] as const;
