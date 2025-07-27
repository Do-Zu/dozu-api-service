import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

export type ITeacherRequestStatus = 'pending' | 'approved' | 'rejected';
export const teacherRequestStatusEnum = pgEnum('teacher_request_status', ['pending', 'approved', 'rejected']);

export const teacherRequestsTable = pgTable('teacher_requests', {
    requestId: serial('request_id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    description: text('description').notNull().default(''),
    status: teacherRequestStatusEnum().notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
