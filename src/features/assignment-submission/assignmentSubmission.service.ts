import db from '@/libs/drizzleClient.lib';
import { IAssignmentSubmission, InsertAssignmentSubmission } from './assignmentSubmission.type';
import { assignmentSubmissionsTable } from '@/models';

class AssignmentSubmissionService {
    public async createDefaultAssignmentSubmission({
        assignmentId,
        studentId,
    }: {
        assignmentId: number;
        studentId: number;
    }) {
        const data: InsertAssignmentSubmission = { studentId, assignmentId };
        const [result] = (await db.insert(assignmentSubmissionsTable).values(data).returning()) as (
            | IAssignmentSubmission
            | undefined
        )[];

        return result;
    }
}

export default new AssignmentSubmissionService();
