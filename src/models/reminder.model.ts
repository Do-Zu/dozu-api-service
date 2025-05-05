import { pgTable, serial, integer, varchar, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';
import { schedulesTable } from '@/models/schedule.model';
import { studySlotsTable } from '@/models/studySlot.model';

// Create enum for reminder status
export const reminderStatusEnum = pgEnum('reminder_status', ['pending', 'accepted', 'declined']);

export const remindersTable = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => usersTable.userId, { onDelete: 'set null' }),
  taskId: integer('task_id').references(() => studySlotsTable.id, { onDelete: 'set null' }),
  originalScheduleId: integer('original_schedule_id').references(() => schedulesTable.id, {
    onDelete: 'set null',
  }),
  newScheduleId: integer('new_schedule_id').references(() => schedulesTable.id, {
    onDelete: 'set null',
  }),
  newSuggestedTime: timestamp('new_suggested_time').notNull(),
  overdue: boolean('overdue').default(false),
  status: reminderStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
