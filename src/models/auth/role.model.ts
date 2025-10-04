import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

export const rolesTable = pgTable('roles', {
  roleId: serial('role_id').primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  description: text('description').notNull(),
});

export type SelectRole = typeof rolesTable.$inferSelect;
export type InsertRole = typeof rolesTable.$inferInsert;
