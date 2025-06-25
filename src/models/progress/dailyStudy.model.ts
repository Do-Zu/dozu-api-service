import {
  pgTable,
  varchar,
  date,
  integer,
  timestamp,
  serial
} from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

export const dailyStudyRecordsTable = pgTable('daily_study_records', {
  dailyStudyId: serial('daily_study_id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  date: date('date').notNull(), // yyyy-mm-dd
  totalMinutes: integer('total_minutes').notNull().default(0),
  sessionsCount: integer('sessions_count').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Export types
export type DailyStudyRecord = typeof dailyStudyRecordsTable.$inferSelect;
export type DailyStudyRecordInsert = typeof dailyStudyRecordsTable.$inferInsert;
