import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { studySlotTable } from '@/models/studySlot.model';
import { learningMethodsTable } from '@/models/learningMethod.model';

export const studySlotLearningMethodsTable = pgTable('study_slots_learning_methods', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id')
    .notNull()
    .references(() => studySlotTable.id, { onDelete: 'cascade' }),
  methodId: integer('method_id')
    .notNull()
    .references(() => learningMethodsTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});
