import { usersTable } from '@/models';
import { integer, pgEnum, pgTable, serial, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { assignmentsTable } from './assignment.model';

export const submissionStatusEnumType = pgEnum('submission_status_type', ['draft', 'submitted', 'returned']);
export enum SubmissionStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    RETURNED = 'returned',
}

export const assignmentSubmissionsTable = pgTable(
    'assignment_submissions',
    {
        submissionId: serial('submission_id').primaryKey(),
        assignmentId: integer('assignment_id')
            .notNull()
            .references(() => assignmentsTable.assignmentId, { onDelete: 'cascade' }),
        studentId: integer('student_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        grade: integer('grade'),
        submittedAt: timestamp('submitted_at', { withTimezone: true }),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
        returnedAt: timestamp('returned_at', { withTimezone: true }),
        status: submissionStatusEnumType('status').notNull().default('draft'),
    },
    table => ({
        uniqueStudentAssignment: uniqueIndex('unique_student_assignment').on(table.assignmentId, table.studentId),
    })
);
