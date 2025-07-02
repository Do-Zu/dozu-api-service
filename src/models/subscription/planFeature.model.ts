import {
    pgTable,
    serial,
    integer,
    decimal,
    text,
    boolean,
    jsonb,
    timestamp,
    foreignKey,
    uniqueIndex,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { plansTable } from './plan.model';
import { featuresTable } from './feature.model';

// Enum for feature interval types
export const featureIntervalEnum = pgEnum('feature_interval', ['daily', 'weekly', 'monthly', 'yearly']);

// Plan Features table - defines what features are included in each plan and their limits
export const planFeaturesTable = pgTable(
    'plan_features',
    {
        planFeatureId: serial('plan_feature_id').primaryKey(),
        planId: integer('plan_id').notNull(),
        featureId: integer('feature_id').notNull(),

        // Feature value/limit configuration
        booleanValue: boolean('boolean_value'), // For boolean features
        numericValue: decimal('numeric_value', { precision: 15, scale: 2 }), // For quota/limit features
        textValue: text('text_value'), // For text-based features

        interval: featureIntervalEnum('interval').notNull().default('daily'),

        // Additional configuration
        isUnlimited: boolean('is_unlimited').notNull().default(false), // For unlimited features
        isEnabled: boolean('is_enabled').notNull().default(true),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
    },
    table => ({
        planIdFk: foreignKey({
            columns: [table.planId],
            foreignColumns: [plansTable.planId],
            name: 'plan_features_plan_id_fk',
        }),
        featureIdFk: foreignKey({
            columns: [table.featureId],
            foreignColumns: [featuresTable.featureId],
            name: 'plan_features_feature_id_fk',
        }),
        uniquePlanFeature: uniqueIndex('unique_plan_feature').on(table.planId, table.featureId),
    })
);

export type SelectPlanFeature = typeof planFeaturesTable.$inferSelect;
export type InsertPlanFeature = typeof planFeaturesTable.$inferInsert;
