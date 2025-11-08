import { pgTable, serial, integer, real, check, boolean, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';
import { sql } from 'drizzle-orm';

export const ankiSettingsTable = pgTable(
    'anki_settings',
    {
        ankiSettingId: serial('anki_setting_id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        isDefault: boolean('is_default').notNull().default(false),
        name: varchar('name', { length: 255 }).notNull(), // name of the setting 
        // these fields below are parameters of Anki algorithm
        learningSteps: integer('learning_steps').array().notNull().default([1, 10]), // time-unit: MINUTE
        graduatingInterval: integer('graduating_interval').notNull().default(1), // time-unit: DAY
        easyInterval: integer('easy_interval').notNull().default(4), // time-unit: DAY
        relearningSteps: integer('relearning_steps').array().notNull().default([10]), // time-unit: MINUTE
        minimumInterval: integer('minimum_interval').notNull().default(1), // time-unit: DAY
        maximumInterval: integer('maximum_interval').notNull().default(36500), // time-unit: DAY
        startingEase: real('starting_ease').notNull().default(2.5),
        easyBonus: real('easy_bonus').notNull().default(1.3),
        intervalModifier: real('interval_modifier').notNull().default(1.0),
        hardInterval: real('hard_interval').notNull().default(1.2),
        newInterval: real('new_interval').notNull().default(0.0),
        newCardsPerDay: integer('new_cards_per_day').notNull().default(20),
        maximumReviewsPerDay: integer('maximum_reviews_per_day').notNull().default(200),
    },
    table => ({
        graduatingIntervalBounds: check(
            'graduating_interval_bounds',
            sql`${table.graduatingInterval} BETWEEN 1 AND 9999`
        ),
        easyIntervalBounds: check('easy_interval_bounds', sql`${table.easyInterval} BETWEEN 1 AND 9999`),
        minimumIntervalBounds: check('minimum_interval_bounds', sql`${table.minimumInterval} BETWEEN 1 AND 9999`),
        maximumIntervalBounds: check('maximum_interval_bounds', sql`${table.maximumInterval} BETWEEN 1 AND 36500`),
        startingEaseBounds: check(
            'starting_ease_bounds',
            sql`${table.startingEase} > 1.3 AND ${table.startingEase} <= 5`
        ),
        easyBonusBounds: check('easy_bonus_bounds', sql`${table.easyBonus} BETWEEN 1 AND 5`),
        intervalModifierBounds: check('interval_modifier_bounds', sql`${table.intervalModifier} BETWEEN 0.5 AND 2`),
        hardIntervalBounds: check('hard_interval_bounds', sql`${table.hardInterval} BETWEEN 0.5 AND 1.3`),
        newIntervalBounds: check('new_interval_bounds', sql`${table.newInterval} BETWEEN 0 AND 1`),
        newCardsPerDayBounds: check('new_cards_per_day_bounds', sql`${table.newCardsPerDay} BETWEEN 0 AND 9999`),
        maximumReviewsPerDayBounds: check(
            'maximum_reviews_per_day_bounds',
            sql`${table.maximumReviewsPerDay} BETWEEN 0 AND 9999`
        ),
        intervalRangeValid: check('interval_range_valid', sql`${table.maximumInterval} >= ${table.minimumInterval}`),
        uniqueDefaultSettingPerUser: uniqueIndex('unique_default_setting_per_user')
            .on(table.userId)
            .where(sql`${table.isDefault} = true`),
        uniqueSettingUser: uniqueIndex('unique_setting_user').on(table.ankiSettingId, table.userId),
    })
);
