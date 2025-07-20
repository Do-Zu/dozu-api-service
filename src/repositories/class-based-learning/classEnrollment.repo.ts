import db from '@/libs/drizzleClient.lib';
import { classEnrollmentsTable } from '@/models';
import { IClassEnrollment } from '@/types/class-based-learning/classEnrollment.type';

export type IStudentEnrollmentRepo = Pick<IClassEnrollment, 'classId' | 'studentId'>;

class ClassEnrollmentRepo {
    public async addStudentToClass(data: IStudentEnrollmentRepo) {
        const [enrollment] = await db.insert(classEnrollmentsTable).values(data).returning({
            classEnrollmentId: classEnrollmentsTable.classEnrollmentId,
            classId: classEnrollmentsTable.classId,
            enrolledAt: classEnrollmentsTable.enrolledAt,
        });
        return enrollment;
    }
}

export default new ClassEnrollmentRepo();