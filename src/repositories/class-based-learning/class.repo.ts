import db from '@/libs/drizzleClient.lib';
import { classEnrollmentsTable, classesTable, usersTable } from '@/models';
import { IClass } from '@/types/class-based-learning/class.type';
import { eq } from 'drizzle-orm';

export type ICreateClassRepo = Pick<IClass, 'name' | 'description' | 'invitationCode'> & { teacherId: number };
export type IUpdateClassRepo = Pick<IClass, 'name' | 'description'>;

class ClassRepo {
    public async getClassById(classId: number): Promise<IClass | undefined> {
        const [result] = await db
            .select({
                classId: classesTable.classId,
                name: classesTable.name,
                description: classesTable.description,
                invitationCode: classesTable.invitationCode,
                createdAt: classesTable.createdAt,
            })
            .from(classesTable)
            .where(eq(classesTable.classId, classId));
        return result;
    }

    public async getClassesForStudent(userId: number): Promise<IClass[]> {
        const classes = await db
            .select({
                classId: classesTable.classId,
                name: classesTable.name,
                description: classesTable.description,
                invitationCode: classesTable.invitationCode,
                createdAt: classesTable.createdAt,
                enrolledAt: classEnrollmentsTable.enrolledAt,
                teacherName: usersTable.fullName,
                teacherImageUrl: usersTable.avatarUrl,
            })
            .from(classEnrollmentsTable)
            .innerJoin(classesTable, eq(classesTable.classId, classEnrollmentsTable.classId))
            .innerJoin(usersTable, eq(usersTable.userId, classesTable.teacherId))
            .where(eq(classEnrollmentsTable.studentId, userId));
        return classes;
    }

    public async getClassesForTeacher(userId: number): Promise<IClass[]> {
        const classes = await db
            .select({
                classId: classesTable.classId,
                name: classesTable.name,
                description: classesTable.description,
                invitationCode: classesTable.invitationCode,
                createdAt: classesTable.createdAt,
            })
            .from(classesTable)
            .where(eq(classesTable.teacherId, userId));
        return classes;
    }

    public async createClassForUser(data: ICreateClassRepo): Promise<IClass> {
        const [result] = await db.insert(classesTable).values(data).returning({
            classId: classesTable.classId,
            name: classesTable.name,
            description: classesTable.description,
            invitationCode: classesTable.invitationCode,
            createdAt: classesTable.createdAt,
        });
        return result;
    }

    public async updateClassById(classId: number, data: IUpdateClassRepo): Promise<IClass> {
        const [result] = await db.update(classesTable).set(data).where(eq(classesTable.classId, classId)).returning({
            classId: classesTable.classId,
            name: classesTable.name,
            description: classesTable.description,
            invitationCode: classesTable.invitationCode,
            createdAt: classesTable.createdAt,
        });
        return result;
    }

    public async getClassByInvitationCode(invitationCode: string): Promise<IClass> {
        const [result] = await db
            .select({
                teacherId: classesTable.teacherId,
                classId: classesTable.classId,
                name: classesTable.name,
                description: classesTable.description,
                invitationCode: classesTable.invitationCode,
                createdAt: classesTable.createdAt,
            })
            .from(classesTable)
            .where(eq(classesTable.invitationCode, invitationCode));

        return result;
    }
}

export default new ClassRepo();
