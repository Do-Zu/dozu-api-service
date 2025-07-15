import { boolean, decimal, foreignKey, integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';
import { featuresTable } from './feature.model';
import { userSubscriptionsTable } from './userSubscription.model';

// User Feature Usage table - tracks user's usage of features
export const userFeatureUsageTable = pgTable(
    'user_feature_usage',
    {
        usageId: serial('usage_id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        featureId: integer('feature_id')
            .notNull()
            .references(() => featuresTable.featureId, { onDelete: 'cascade' }),
        subscriptionId: integer('subscription_id').references(() => userSubscriptionsTable.subscriptionId, {
            onDelete: 'cascade',
        }), // Optional: track which subscription provided the usage

        // Usage tracking
        usedValue: decimal('used_value', { precision: 15, scale: 2 }).notNull().default('0'),
        limitValue: decimal('limit_value', { precision: 15, scale: 2 }), // Current limit for this user
        isUnlimited: boolean('is_unlimited').notNull().default(false),

        // Reset information
        resetPeriodStart: timestamp('reset_period_start', { withTimezone: true }).notNull(),
        resetPeriodEnd: timestamp('reset_period_end', { withTimezone: true }).notNull(),
        lastResetAt: timestamp('last_reset_at', { withTimezone: true }),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
    },
    table => ({
        userIdFk: foreignKey({
            columns: [table.userId],
            foreignColumns: [usersTable.userId],
            name: 'user_feature_usage_user_id_fk',
        }),
        featureIdFk: foreignKey({
            columns: [table.featureId],
            foreignColumns: [featuresTable.featureId],
            name: 'user_feature_usage_feature_id_fk',
        }),
        subscriptionIdFk: foreignKey({
            columns: [table.subscriptionId],
            foreignColumns: [userSubscriptionsTable.subscriptionId],
            name: 'user_feature_usage_subscription_id_fk',
        }),
    })
);

export type SelectUserFeatureUsage = typeof userFeatureUsageTable.$inferSelect;
export type InsertUserFeatureUsage = typeof userFeatureUsageTable.$inferInsert;
