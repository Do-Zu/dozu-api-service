import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';
import { classesTable } from './class.model';

export const classFeedTypeEnum = pgEnum('feed_type', ['announcement', 'new_content']);
// announcement: general content
// new_content: learning content (topic, flashcard) is created => sent to students
export type IClassFeedType = 'announcement' | 'new_content';

export const classFeedsTable = pgTable('class_feeds', {
    classFeedId: serial('class_feed_id').primaryKey(),
    classId: integer('class_id')
        .notNull()
        .references(() => classesTable.classId, { onDelete: 'cascade' }),
    senderId: integer('sender_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }), // default is teacher of class
    type: classFeedTypeEnum().notNull().default('announcement'),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull().default(''),
    link: text('link'), // link (if provided) for moving to learning content created (just example)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
});
