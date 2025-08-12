import { BadRequest } from '@/core/error';
import classRepo, { ICreateClassRepo } from '@/repositories/class-based-learning/class.repo';
import { IClass, ICreateClassBody, IUpdateClassBody } from '@/types/class-based-learning/class.type';

const getRandomNumbers = async () => {
    const { customAlphabet } = await import('nanoid');
    return customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 8)();
};

class ClassService {
    // todo: make sure it unique
    public async generateInvitationCode(): Promise<string> {
        const id = await getRandomNumbers();
        return id;
    }

    public async getClassById(classId: number): Promise<IClass | undefined> {
        const result = await classRepo.getClassById(classId);
        return result;
    }

    public async getClassesForStudent(userId: number): Promise<IClass[]> {
        const result = await classRepo.getClassesForStudent(userId);
        return result;
    }

    public async getClassesForTeacher(userId: number) {
        const result = await classRepo.getClassesForTeacher(userId);
        return result;
    }

    public async createClassForTeacher(userId: number, data: ICreateClassBody): Promise<IClass> {
        const invitationCode = await this.generateInvitationCode();
        const value : ICreateClassRepo = { ...data, teacherId: userId, invitationCode };
        const result = await classRepo.createClassForTeacher(value);
        return result;
    }

    public async updateClassById(classId: number, data: IUpdateClassBody): Promise<IClass> {
        const result = await classRepo.updateClassById(classId, data);
        return result;
    }

    public async getClassByInvitationCode(invitationCode: string) {
        const result = await classRepo.getClassByInvitationCode(invitationCode);
        if(!result) {
            throw new BadRequest('Invitation Code does not exist');
        }
        return result;
    }

    public async isTeacherOwnerOfClass(classId: number, teacherId: number) {
        const result = await classRepo.isTeacherOwnerOfClass(classId, teacherId);
        return result;
    }
}

export default new ClassService();
