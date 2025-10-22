import { assignmentsTable } from '@/models/class-based-learning/assignment/assignment.model';

export enum AssignmentStatusEnum {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    PUBLISHED = 'published',
    CLOSED = 'closed',
}

export type IASsignmentStatus = 'draft' | 'scheduled' | 'published' | 'closed';

export type IAssignment = typeof assignmentsTable.$inferSelect;
export type InsertAssignment = typeof assignmentsTable.$inferInsert;
export type InsertAssignmentBody = Omit<InsertAssignment, 'teacherId' | 'classId'>;
