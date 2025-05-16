import { pgTable, text, timestamp, unique, serial, integer } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

export const authAccountsTable = pgTable(
  'auth_account',
  {
    authAccountId: serial('auth_account_id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.userId, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // e.g., 'google', 'github'
    providerId: text('provider_id').notNull(), // e.g., Google's "sub" or GitHub's "id"
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [unique().on(table.provider, table.providerId)]
);

export type SelectAuthAccount = typeof authAccountsTable.$inferSelect;
export type InsertAuthAccount = typeof authAccountsTable.$inferInsert;
