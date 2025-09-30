import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

export const changePasswordRequestTable = pgTable('change_password_requests', {
  changePasswordRequestId: serial('change_password_request_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),

  verificationCode: text('verification_code'),
  expiration: timestamp('expiration', { withTimezone: true }).defaultNow(),
});

export type SelectChangePasswordRequest = typeof changePasswordRequestTable.$inferSelect;
export type InsertChangePasswordRequest = typeof changePasswordRequestTable.$inferInsert;
