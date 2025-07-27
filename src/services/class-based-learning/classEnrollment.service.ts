import classEnrollmentRepo from "@/repositories/class-based-learning/classEnrollment.repo";
import { IStudentInClass } from "@/types/class-based-learning/classEnrollment.type";

class ClassEnrollmentService {
    public async addStudentToClass(classId: number, studentId: number) {
        const result = await classEnrollmentRepo.addStudentToClass({ classId, studentId });
        return result;
    }

    public async removeStudentFromClass(classId: number, studentId: number): Promise<void> {
        const enrollment = await classEnrollmentRepo.getEnrollmentByClassAndStudent(classId, studentId);
        await classEnrollmentRepo.removeStudentFromClass(enrollment.classEnrollmentId);
    }

    public async isStudentInClass(classId: number, studentId: number): Promise<boolean> {
        const result = await classEnrollmentRepo.isStudentInClass(classId, studentId);
        return result;
    }

    public async getStudentsInClass(classId: number): Promise<IStudentInClass[]> {
        const result = await classEnrollmentRepo.getStudentsInClass(classId);
        return result;
    }
}

export default new ClassEnrollmentService();