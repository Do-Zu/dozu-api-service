import {
    pgTable,
    serial,
    integer,
    varchar,
    text,
    timestamp,
    boolean,
    decimal,
    jsonb,
    pgEnum,
    foreignKey,
    index,
} from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';
import { plansTable } from './plan.model';

// Enum for subscription status
export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active',
    'cancelled',
    'expired',
    'pending',
    'suspended',
    'trialing',
]);

// Enum for payment status
export const paymentStatusEnum = pgEnum('payment_status', [
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
]);

export const userSubscriptionsTable = pgTable(
    'user_subscriptions',
    {
        subscriptionId: serial('subscription_id').primaryKey(),
        userId: integer('user_id').notNull(),
        planId: integer('plan_id').notNull(),

        // Subscription details
        status: subscriptionStatusEnum('status').notNull().default('pending'),

        // Billing information
        currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(), // Marks the beginning of the current billing cycle
        currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(), // Marks the end of the current billing cycle
        trialStart: timestamp('trial_start', { withTimezone: true }), // when a free trial period begins
        trialEnd: timestamp('trial_end', { withTimezone: true }), // when a free trial period end

        // Cancellation
        cancelAt: timestamp('cancel_at', { withTimezone: true }),
        canceledAt: timestamp('canceled_at', { withTimezone: true }),
        cancellationReason: text('cancellation_reason'),

        externalSubscriptionId: varchar('external_subscription_id', { length: 255 }), // ID from external payment provider (e.g., Stripe, PayPal)

        autoRenew: boolean('auto_renew').notNull().default(true),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
    },
    table => ({
        userIdFk: foreignKey({
            columns: [table.userId],
            foreignColumns: [usersTable.userId],
            name: 'user_subscriptions_user_id_fk',
        }),
        planIdFk: foreignKey({
            columns: [table.planId],
            foreignColumns: [plansTable.planId],
            name: 'user_subscriptions_plan_id_fk',
        }),
    })
);

export type SelectUserSubscription = typeof userSubscriptionsTable.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptionsTable.$inferInsert;
