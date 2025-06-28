import { pgTable, serial, integer, varchar, text, timestamp, vector } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model'; // adjust path as needed

export const topicsTable = pgTable('topics', {
    topicId: serial('topic_id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    // embedding: vector('embedding', { dimensions: 384 }),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
