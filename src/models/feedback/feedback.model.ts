import { usersTable } from '@/models';
import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const feedbackTable = pgTable('feedback', {
    feedbackId: serial('feedback_id').primaryKey(),

    message: text('message').notNull(),

    userId: integer('user_id').references(() => usersTable.userId, {
        onDelete: 'set null',
    }),

    userEmail: varchar('user_email', { length: 255 }),
    userName: varchar('user_name', { length: 255 }),

    imageUrl: text('image_url'),

    // store evaluation for audit/analytics
    score: integer('score').notNull().default(0),
    shouldSendEmail: integer('should_send_email').notNull().default(0), // 0/1 for simplicity in SQL migrations
    reasons: text('reasons'), // JSON string array (nullable in SQL)

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TypeSelectFeedback = typeof feedbackTable.$inferSelect;
export type TypeInsertFeedback = typeof feedbackTable.$inferInsert;
