import { integer, pgTable, primaryKey, unique } from 'drizzle-orm/pg-core';
import { rolesTable } from './role.model';
import { usersTable } from '../user.model';

export const userRolesTable = pgTable(
  'user_roles',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.userId, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => rolesTable.roleId, { onDelete: 'cascade' }),
  },
  table => [unique().on(table.userId, table.roleId)]
);

export type SelectUserRolesPermission = typeof userRolesTable.$inferSelect;
export type InsertUserRolesPermission = typeof userRolesTable.$inferInsert;
