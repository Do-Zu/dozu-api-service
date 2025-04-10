import { create } from 'domain';
import { integer, pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const demoTable = pgTable('demo', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  action: varchar('action', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
