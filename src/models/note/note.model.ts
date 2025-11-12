import { integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { topicsTable } from '../topic/topic.model';
import { usersTable } from '../user.model';

export const notesTable = pgTable(
    'notes',
    {
        noteId: serial('note_id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        topicId: integer('topic_id')
            .notNull()
            .references(() => topicsTable.topicId, { onDelete: 'cascade' }),

        content: text('content').notNull().default(''),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
    },
    table => ({
        uniqueUserTopic: unique().on(table.userId, table.topicId),
    })
);

export type TypeSelectNote = typeof notesTable.$inferSelect;
export type TypeInsertNote = typeof notesTable.$inferInsert;
