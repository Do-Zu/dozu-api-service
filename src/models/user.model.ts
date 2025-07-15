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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  preferences: jsonb('preferences'),
  freeTime: jsonb('free_time'),
  busyTime: jsonb('busy_time'),

  hobbiesTopic: text('hobbies_topic'),
  avgStudyDuration: interval('avg_study_duration'),
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false),

  isNewUser: boolean('is_new_user').default(true),
  hasCompletedOnboarding: boolean('has_completed_onboarding').default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
