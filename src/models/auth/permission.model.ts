import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

export const permissionsTable = pgTable('permissions', {
  permissionId: serial('permission_id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description').notNull(),
});

export type SelectPermission = typeof permissionsTable.$inferSelect;
export type InsertPermission = typeof permissionsTable.$inferInsert;
