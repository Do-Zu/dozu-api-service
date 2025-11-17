import { TypeSelectAttachment } from '@/models';
import { assignmentsTable } from '@/models/class-based-learning/assignment/assignment.model';
import { IInputResource } from '@/types/class-based-learning/classwork/attachment.type';

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
> & { inputResources?: IInputResource[] };

export type IUpdateAssignment = Pick<
    InsertAssignment,
    | 'topicId'
    | 'title'
    | 'content'
    | 'deadline'
    | 'totalGrades'
    | 'status'
    | 'acceptingSubmissions'
    | 'publishedAt'
    | 'updatedAt'
>;

export type IUpdateAssignmentBody = Omit<IUpdateAssignment, 'publishedAt' | 'updatedAt'> & {
    inputResources?: IInputResource[];
};

export type IAssignmentWithAttachments = {
    assignment: IAssignment;
    attachments: TypeSelectAttachment[];
};
