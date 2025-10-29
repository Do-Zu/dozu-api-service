import { assignmentSubmissionsTable } from '@/models';
import { SanitizedUser } from '@/types/auth/sanitizedUser.type';

export enum AssignmentSubmissionStatusEnum {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    RETURNED = 'returned',
}
export type IAssignmentSubmissionStatus = 'draft' | 'submitted' | 'returned';

export type IAssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;

export type InsertAssignmentSubmissionBody = Pick<InsertAssignmentSubmission, 'studentId' | 'status'>;

export type IUpdateAssignmentSubmission = Pick<
    InsertAssignmentSubmission,
    'updatedAt' | 'status' | 'grade' | 'submittedAt' | 'returnedAt'
>;

export type IUpdateAssignmentSubmissionBody = Pick<IUpdateAssignmentSubmission, 'status'>;

export interface IAssignmentSubmissionWithStudent {
    submission: IAssignmentSubmission;
    student: Pick<SanitizedUser, 'userId' | 'fullName' | 'avatarUrl'>;
}
