import { pgTable, serial, integer, varchar, text, timestamp, vector } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model'; // adjust path as needed
import { classesTable } from '@/models/class-based-learning/class.model';
import { packagesTable } from '../package/package.model';

export const topicsTable = pgTable('topics', {
    topicId: serial('topic_id').primaryKey(),
    // package id can be NULL
    package_id: integer('package_id').references(() => packagesTable.id, {
        onDelete: 'set null',
    }),
    // topic belong to which class, classId can be NULL if that topic belong to a user (student) with no class-based learning
    classId: integer('class_id').references(() => classesTable.classId, { onDelete: 'cascade' }),
    userId: integer('user_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    // embedding: vector('embedding', { dimensions: 384 }),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
