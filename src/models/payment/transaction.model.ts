import {
    pgTable,
    serial,
    integer,
    varchar,
    timestamp,
    decimal,
    text,
    json,
    foreignKey,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from '../user.model';

export const paymentStatus = pgEnum('payment_status', [
    'pending',
    'processing',
    'success',
    'failed',
    'expired',
    'cancelled',
]);

export type IPaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'expired' | 'cancelled';

export const transactionsModel = pgTable(
    'transactions',
    {
        transactionId: serial('transaction_id').primaryKey(),
        userId: integer('user_id').notNull(),
        gateway: varchar('gateway', { length: 100 }).notNull(),
        transactionDate: timestamp('transaction_date').notNull().defaultNow(),
        accountNumber: varchar('account_number', { length: 100 }),
        amount: decimal('amount', { precision: 20, scale: 2 }).notNull().default('0.00'),
        currency: varchar('currency', { length: 5 }).notNull(),
        code: varchar('code', { length: 250 }),
        paymentId: varchar('payment_id', { length: 250 }),
        description: text('desc'),
        status: paymentStatus('status').notNull().default('pending'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
        metadata: json('metadata'),
    },
    table => ({
        userIdFk: foreignKey({
            columns: [table.userId],
            foreignColumns: [usersTable.userId],
            name: 'transactions_user_id_fk',
        }),
    })
);

export const transactionsRelations = relations(transactionsModel, ({ one }) => ({
    user: one(usersTable, {
        fields: [transactionsModel.userId],
        references: [usersTable.userId],
    }),
}));

export type Transaction = typeof transactionsModel.$inferSelect;
export type InsertTransaction = typeof transactionsModel.$inferInsert;
