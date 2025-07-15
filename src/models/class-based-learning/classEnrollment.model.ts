import { usersTable } from '@/models';
import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { classesTable } from './class.model';

export const classEnrollmentsTable = pgTable(
    'class_enrollments',
    {
        classEnrollmentId: serial('class_enrollment_id').primaryKey(),
        classId: integer('class_id')
            .notNull()
            .references(() => classesTable.classId, { onDelete: 'cascade' }),
        studentId: integer('student_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        uniqueEnrollment: unique().on(table.classId, table.studentId),
    })
);
