import {
  pgTable,
  varchar,
  date,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

export const dailyStudyRecordsTable = pgTable('daily_study_records', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  date: date('date').notNull(), // yyyy-mm-dd
  totalMinutes: integer('total_minutes').notNull().default(0),
  sessionsCount: integer('sessions_count').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Export types
export type DailyStudyRecord = typeof dailyStudyRecordsTable.$inferSelect;
export type DailyStudyRecordInsert = typeof dailyStudyRecordsTable.$inferInsert;
