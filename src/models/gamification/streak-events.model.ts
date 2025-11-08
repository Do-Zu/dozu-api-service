import {
  pgTable,
  serial,
  integer,
  timestamp,
  varchar,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';

export const streakEventsTable = pgTable('streak_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'streak_continued', 'streak_broken', 'streak_restarted', 'freeze_used'
  pointsAwarded: integer('points_awarded').notNull().default(0),
  streakCount: integer('streak_count').notNull(),
  isProcessed: boolean('is_processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Ensure only one event per user per day
  uniqueUserDate: unique().on(table.userId, table.eventDate),
}));

export type SelectStreakEvent = typeof streakEventsTable.$inferSelect;
export type InsertStreakEvent = typeof streakEventsTable.$inferInsert;
