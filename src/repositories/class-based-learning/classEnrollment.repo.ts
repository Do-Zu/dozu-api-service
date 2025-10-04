import db, { Transaction } from '@/libs/drizzleClient.lib';
import { classEnrollmentsTable, usersTable } from '@/models';
import { IClassEnrollment, IStudentInClass } from '@/types/class-based-learning/classEnrollment.type';
import { and, eq } from 'drizzle-orm';

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

    public async removeStudentFromClass(classEnrollmentId: number, tx?: Transaction): Promise<void> {
        const executor = tx ?? db;
        await executor
            .delete(classEnrollmentsTable)
            .where(eq(classEnrollmentsTable.classEnrollmentId, classEnrollmentId));
    }

    public async getEnrollmentByClassAndStudent(classId: number, studentId: number): Promise<IClassEnrollment> {
        const [enrollment] = await db
            .select({
                classEnrollmentId: classEnrollmentsTable.classEnrollmentId,
                classId: classEnrollmentsTable.classId,
                studentId: classEnrollmentsTable.studentId,
                enrolledAt: classEnrollmentsTable.enrolledAt,
            })
            .from(classEnrollmentsTable)
            .where(and(eq(classEnrollmentsTable.classId, classId), eq(classEnrollmentsTable.studentId, studentId)));

        return enrollment;
    }

    public async isStudentInClass(classId: number, studentId: number): Promise<boolean> {
        const result = await db
            .select({})
            .from(classEnrollmentsTable)
            .where(and(eq(classEnrollmentsTable.classId, classId), eq(classEnrollmentsTable.studentId, studentId)))
            .limit(1);
        return result.length === 1;
    }

    public async getStudentsInClass(classId: number): Promise<IStudentInClass[]> {
        const result = await db
            .select({
                userId: usersTable.userId,
                username: usersTable.username,
                fullName: usersTable.fullName,
                avatarUrl: usersTable.avatarUrl,
                enrolledAt: classEnrollmentsTable.enrolledAt,
            })
            .from(classEnrollmentsTable)
            .innerJoin(usersTable, eq(usersTable.userId, classEnrollmentsTable.studentId))
            .where(eq(classEnrollmentsTable.classId, classId));
        return result;
    }
}

export default new ClassEnrollmentRepo();
