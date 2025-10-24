import { assignmentsTable } from '@/models/class-based-learning/assignment/assignment.model';

export enum AssignmentStatusEnum {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    PUBLISHED = 'published',
    CLOSED = 'closed',
}

export type IAssignmentStatus = 'draft' | 'scheduled' | 'published' | 'closed';

export type IAssignment = typeof assignmentsTable.$inferSelect;
export type InsertAssignment = typeof assignmentsTable.$inferInsert;

export type InsertAssignmentBody = Pick<
    InsertAssignment,
    'topicId' | 'title' | 'content' | 'deadline' | 'totalGrades' | 'status' | 'acceptingSubmissions'
>;

export type IUpdateAssignment = Pick<
    InsertAssignment,
    'topicId' | 'title' | 'content' | 'deadline' | 'totalGrades' | 'status' | 'acceptingSubmissions' | 'updatedAt'
>;

export type IUpdateAssignmentBody = Omit<IUpdateAssignment, 'updatedAt'>;
