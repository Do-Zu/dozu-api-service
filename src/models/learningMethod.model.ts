import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';

export const learningMethodsTable = pgTable('learning_methods', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => usersTable.userId, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
