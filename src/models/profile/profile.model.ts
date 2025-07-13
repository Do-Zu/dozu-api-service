import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';

export const profilesTable = pgTable('profiles', {
  profileId: serial('profile_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, {
    onDelete: 'cascade',
  }),
  
  // Profile display information
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  location: varchar('location', { length: 100 }),
  website: varchar('website', { length: 255 }),
  
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
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});

// Type definitions for TypeScript
export type SelectProfile = typeof profilesTable.$inferSelect;
export type InsertProfile = typeof profilesTable.$inferInsert;

// Profile data with user information joined
export type ProfileWithUser = SelectProfile & {
  user: {
    userId: number;
    username: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    hobbiesTopic: string | null;
    preferences: any;
    freeTime: any;
    busyTime: any;
    role: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date | null;
  };
};

// Profile update data type
export type ProfileUpdateData = Partial<Omit<InsertProfile, 'profileId' | 'userId' | 'createdAt'>>;

// Notification settings type
export interface NotificationSettings {
  dailyReminders: boolean;
  weeklyReports: boolean;
  achievementNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// Privacy settings type
export interface PrivacySettings {
  showProfile: boolean;
  showProgress: boolean;
  showAchievements: boolean;
  allowMessages: boolean;
}

// Learning preferences type
export interface LearningGoals {
  primaryGoal: string;
  targetSkills: string[];
  timeCommitment: number; // hours per week
  deadline?: Date;
}

export interface StudyPreferences {
  preferredTimeSlots: string[];
  sessionDuration: number; // minutes
  breakDuration: number; // minutes
  reminderFrequency: string;
  studyMethods: string[];
}