import { pgTable, serial, integer, varchar, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';
import { schedulesTable } from '@/models/schedule/schedule.model';
import { studySlotTable } from '@/models/schedule/studySlot.model';

// Create enum for reminder status
export const reminderStatusEnum = pgEnum('reminder_status', ['pending', 'accepted', 'declined']);

export const remindersTable = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  taskId: integer('task_id')
    .notNull()
    .references(() => studySlotTable.studySlotId, { onDelete: 'cascade' }),
  originalScheduleId: integer('original_schedule_id').references(() => schedulesTable.id, {
    onDelete: 'set null',
  }),
  newScheduleId: integer('new_schedule_id').references(() => schedulesTable.id, {
    onDelete: 'set null',
  }),
  newSuggestedTime: timestamp('new_suggested_time', { withTimezone: true }).notNull(),
  overdue: boolean('overdue').default(false),
  status: reminderStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
