import { pgTable, serial, varchar, text, timestamp, boolean, decimal, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';

export const planTypeEnum = pgEnum('plan_type', ['free', 'pro', 'team', 'enterprise']);

export type IPlanType = 'free' | 'pro' | 'team' | 'enterprise';

export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'yearly', 'lifetime']);

export type IBillingInterval = 'monthly' | 'yearly' | 'lifetime';

export const plansTable = pgTable(
    'plans',
    {
        planId: serial('plan_id').primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        description: text('description'),
        planType: planTypeEnum('plan_type').notNull(),
        billingInterval: billingIntervalEnum('billing_interval').notNull(),
        price: decimal('price', { precision: 10, scale: 2 }).notNull(),
        currency: varchar('currency', { length: 3 }).notNull().default('USD'),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
    },
    table => ({
        uniquePlanTypeInterval: uniqueIndex('unique_plan_type_interval').on(table.planType, table.billingInterval),
    })
);

export type SelectPlan = typeof plansTable.$inferSelect;
export type InsertPlan = typeof plansTable.$inferInsert;
