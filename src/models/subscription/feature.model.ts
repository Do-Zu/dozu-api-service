import {
    pgTable,
    serial,
    varchar,
    text,
    boolean,
    integer,
    decimal,
    jsonb,
    timestamp,
    pgEnum,
} from 'drizzle-orm/pg-core';

// Enum for feature types
export const featureTypeEnum = pgEnum('feature_type', [
    'boolean', // Simple on/off features
    'quota', // Numeric limits (e.g., credits per month)
    'size_limit', // Size limitations (e.g., max file upload size)
    'rate_limit', // Rate limiting (e.g., API calls per minute)
    'text', // Text-based features
]);

// Enum for feature categories
export const featureCategoryEnum = pgEnum('feature_category', [
    'core', // Core functionality
    'storage', // Storage-related features
    'customization', // Customization options
]);

export const unitEnum = pgEnum('unit', [
    'MB', // Megabytes,
    'topics', // Amount of topics
    'users', // Number of users
    'credits', // Credits for usage,
    'files', // Number of files
]);

// Features table - defines all available features
export const featuresTable = pgTable('features', {
    featureId: serial('feature_id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    featureType: featureTypeEnum('feature_type').notNull(),
    category: featureCategoryEnum('category').notNull(),
    unit: unitEnum('unit'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type SelectFeature = typeof featuresTable.$inferSelect;
export type InsertFeature = typeof featuresTable.$inferInsert;
