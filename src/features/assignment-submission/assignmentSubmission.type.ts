import { assignmentSubmissionsTable, TypeSelectAttachment } from '@/models';
import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import { IInputResource } from '@/types/class-based-learning/classwork/attachment.type';

export enum AssignmentSubmissionStatusEnum {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    RETURNED = 'returned',
}
export type IAssignmentSubmissionStatus = 'draft' | 'submitted' | 'returned';

export type IAssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;

export type InsertAssignmentSubmissionBody = Pick<InsertAssignmentSubmission, 'status'>;

export type IUpdateAssignmentSubmission = Pick<
    InsertAssignmentSubmission,
    'updatedAt' | 'status' | 'grade' | 'submittedAt' | 'returnedAt'
>;

export type IUpdateAssignmentSubmissionBody = Pick<IUpdateAssignmentSubmission, 'status'> & {
    inputResources?: IInputResource[];
};

export interface IAssignmentSubmissionWithStudent {
    submission: IAssignmentSubmission | null;
    student: Pick<SanitizedUser, 'userId' | 'fullName' | 'avatarUrl' | 'email' | 'username'>;
}

export type IAssignmentSubmissionWithStudentDetails = IAssignmentSubmissionWithStudent & {
    attachments: TypeSelectAttachment[] | null;
};

export type IAssignmentSubmissionWithAttachments = {
    assignmentSubmission: IAssignmentSubmission;
    attachments: TypeSelectAttachment[];
};
