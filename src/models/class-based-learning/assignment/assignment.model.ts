import { classesTable, topicsTable, usersTable } from '@/models';
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const assignmentStatusEnumType = pgEnum('assignment_status_type', ['draft', 'scheduled', 'published', 'closed']);

export const assignmentsTable = pgTable('assignments', {
    assignmentId: serial('assignment_id').primaryKey(),
    teacherId: integer('teacher_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    classId: integer('class_id')
        .notNull()
        .references(() => classesTable.classId, { onDelete: 'cascade' }),
    topicId: integer('topic_id').references(() => topicsTable.topicId, { onDelete: 'cascade' }), // nullable
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull().default(''),
    deadline: timestamp('deadline', { withTimezone: true }),
    totalGrades: integer('total_grades').notNull().default(100),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    status: assignmentStatusEnumType('status').notNull().default('draft'),
    acceptingSubmissions: boolean('accepting_submissions').notNull(),
    urls: varchar('urls', { length: 2048 }).array(),
});
