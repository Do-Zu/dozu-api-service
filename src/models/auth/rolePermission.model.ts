import { integer, pgTable, primaryKey, unique } from 'drizzle-orm/pg-core';
import { rolesTable } from './role.model';
import { permissionsTable } from './permission.model';

export const rolePermissionsTable = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => rolesTable.roleId, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissionsTable.permissionId, { onDelete: 'cascade' }),
  },
  table => [unique().on(table.roleId, table.permissionId)]
);

export type SelectRolePermission = typeof rolePermissionsTable.$inferSelect;
export type InsertRolePermission = typeof rolePermissionsTable.$inferInsert;
