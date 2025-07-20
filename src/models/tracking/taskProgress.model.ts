import { pgTable, serial, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';
import { studySlotTable } from '@/models/schedule/studySlot.model';

export const taskProgressTable = pgTable('task_progress', {
  progressId: serial('progress_id').primaryKey(),
  taskId: integer('task_id')
    .notNull()
    .references(() => studySlotTable.studySlotId, { onDelete: 'cascade' }),
  percentComplete: doublePrecision('percent_complete'),
  completed: boolean('completed').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
