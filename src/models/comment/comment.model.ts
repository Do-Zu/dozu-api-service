import { usersTable } from '@/models';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const commentsTable = pgTable('comments', {
    commentId: serial('comment_id').primaryKey(),
    senderId: integer('sender_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    content: text('content').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type TypeSelectComment = typeof commentsTable.$inferSelect;
export type TypeInsertComment = typeof commentsTable.$inferInsert;

