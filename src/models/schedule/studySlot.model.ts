import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  interval,
  real,
  boolean,
} from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic/topic.model';

export const studySlotTable = pgTable('study_slots', {
  studySlotId: serial('study_slot_id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  estimatedTime: interval('estimated_time'),
  priority: integer('priority'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  percentComplete: real('percent_complete').default(0),
  isCompleted: boolean('is_completed').default(false),
  deadline: timestamp('deadline', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
