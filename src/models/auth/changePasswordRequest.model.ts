import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

export const changePasswordRequestTable = pgTable(
    'change_password_requests',
    {
        changePasswordRequestId: serial('change_password_request_id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),

        verificationCode: text('verification_code').notNull().unique(),
        expiration: timestamp('expiration', { withTimezone: true }).notNull(),
    },
    table => ({
        userIdIdx: index('change_password_request_user_id_idx').on(table.userId),
    })
);

export type SelectChangePasswordRequest = typeof changePasswordRequestTable.$inferSelect;
export type InsertChangePasswordRequest = typeof changePasswordRequestTable.$inferInsert;
