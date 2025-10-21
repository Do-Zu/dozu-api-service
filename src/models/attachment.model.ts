import { pgTable, serial, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const attachmentTable = pgTable('attachment', {
    attachmentId: serial('set_id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: varchar('description', { length: 255 }),
    contentType: varchar('content_type', { length: 50 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type TypeSelectAttachment = typeof attachmentTable.$inferSelect;
export type TypeInsertAttachment = typeof attachmentTable.$inferInsert;
