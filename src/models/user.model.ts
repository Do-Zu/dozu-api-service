import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  jsonb,
  interval,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('role', ['user', 'admin']);

export const usersTable = pgTable('users', {
  userId: serial('user_id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash'), //set to not null in case user register with 3rd party accounts (google)
  fullName: varchar('full_name', { length: 100 }),
  avatarUrl: text('avatar_url').notNull().default(
    'https://res.cloudinary.com/dsvllb1am/image/upload/f_auto,q_auto/v1/default/tcd6nnm6lgn0jb3puton'
  ),
  role: userRoleEnum().notNull().default('user'), //!replaces UserRoles & Roles tables, favor using permissions
  
  // Profile fields (merged from profiles table)
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  location: varchar('location', { length: 100 }),
  website: varchar('website', { length: 255 }),
  hobbiesTopic: text('hobbies_topic'),
  
  // Learning preferences
  learningGoals: jsonb('learning_goals'),
  studyPreferences: jsonb('study_preferences'),
  difficultyLevel: varchar('difficulty_level', { length: 20 }).default('beginner'),
  
  // Notification settings
  notificationSettings: jsonb('notification_settings').default({
    dailyReminders: true,
    weeklyReports: true,
    achievementNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
  }),
  
  // Privacy settings
  privacySettings: jsonb('privacy_settings').default({
    showProfile: true,
    showProgress: true,
    showAchievements: true,
    allowMessages: true,
  }),
  
  // Profile status
  isPublic: boolean('is_public').default(true),
  isComplete: boolean('is_complete').default(false),
  
  // User preferences and time data
  preferences: jsonb('preferences'),
  freeTime: jsonb('free_time'),
  busyTime: jsonb('busy_time'),
  avgStudyDuration: interval('avg_study_duration'),
  
  // User status
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),
  isNewUser: boolean('is_new_user').default(true),
  hasCompletedOnboarding: boolean('has_completed_onboarding').default(false),
  
  // Streak and gamification
  currentStreak: serial('current_streak').default(0),
  longestStreak: serial('longest_streak').default(0),
  lastStudyDate: timestamp('last_study_date', { withTimezone: true }).defaultNow(),
  streakFreezeUsed: boolean('streak_freeze_used').default(false),
  streakFreezeCount: serial('streak_freeze_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

// Profile-specific types
export interface NotificationSettings {
  dailyReminders: boolean;
  weeklyReports: boolean;
  achievementNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface PrivacySettings {
  showProfile: boolean;
  showProgress: boolean;
  showAchievements: boolean;
  allowMessages: boolean;
}

export interface LearningGoals {
  primaryGoal: string;
  targetSkills: string[];
  timeCommitment: number;
  deadline?: Date;
}

export interface StudyPreferences {
  preferredTimeSlots: string[];
  sessionDuration: number;
  breakDuration: number;
  reminderFrequency: string;
  studyMethods: string[];
}

// User update data type
export type UserUpdateData = Partial<Omit<InsertUser, 'userId' | 'createdAt'>>;
