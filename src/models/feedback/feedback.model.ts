import { usersTable } from '@/models';
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const feedbackStatusEnum = pgEnum('feedback_status', ['new', 'reviewed', 'ignored', 'resolved']);
export const feedbackCategoryEnum = pgEnum('feedback_category', ['bug', 'feature', 'praise', 'other']);

export const feedbackTable = pgTable('feedback', {
    feedbackId: serial('feedback_id').primaryKey(),

    message: text('message').notNull(),

    userId: integer('user_id').references(() => usersTable.userId, {
        onDelete: 'set null',
    }),

    userEmail: varchar('user_email', { length: 255 }),
    userName: varchar('user_name', { length: 255 }),

    imageUrl: text('image_url'),

    // Derived flags for admin dashboard
    hasImage: boolean('has_image').notNull().default(false),
    isImportant: boolean('is_important').notNull().default(false),

    status: feedbackStatusEnum('status').notNull().default('new'),
    category: feedbackCategoryEnum('category'),

    // store evaluation for audit/analytics
    score: integer('score').notNull().default(0),
    shouldSendEmail: integer('should_send_email').notNull().default(0), // 0/1 for simplicity in SQL migrations
    reasons: text('reasons'), // JSON string array (nullable in SQL)

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TypeSelectFeedback = typeof feedbackTable.$inferSelect;
export type TypeInsertFeedback = typeof feedbackTable.$inferInsert;
