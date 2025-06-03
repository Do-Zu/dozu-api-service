import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

export const emailVerificationCodesTable = pgTable('email_verification_codes', {
  emailVerificationCodeId: serial('email_verification_code_id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),

  verificationCode: text('verification_code'),
  expiration: timestamp('expiration', { withTimezone: true }).defaultNow(),
});

export type SelectEmailVerificationCode = typeof emailVerificationCodesTable.$inferSelect;
export type InsertEmailVerificationCode = typeof emailVerificationCodesTable.$inferInsert;
