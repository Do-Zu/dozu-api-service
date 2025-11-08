import { pgTable, serial, integer, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic/topic.model';

export const schedulesTable = pgTable('schedules', {
  id: serial('id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  percentComplete: doublePrecision('percent_complete').default(0),
  completed: boolean('completed').default(false),
  rescheduled: boolean('rescheduled').default(false),
});
