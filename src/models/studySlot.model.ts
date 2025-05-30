import { pgTable, serial, integer, varchar, timestamp, interval } from 'drizzle-orm/pg-core';
import { schedulesTable } from '@/models/schedule.model';
import { inputSetTable } from '@/models/inputSet.model';

export const studySlotTable = pgTable('study_slots', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id')
    .notNull()
    .references(() => schedulesTable.id, { onDelete: 'cascade' }),
  inputSetId: integer('input_set_id').references(() => inputSetTable.setId, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  priorityLevel: interval('priority_level'),
  difficultyLevel: interval('difficulty_level'),
  assignedDuration: interval('assigned_duration').notNull(),
  estimatedTime: interval('estimated_time'),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
