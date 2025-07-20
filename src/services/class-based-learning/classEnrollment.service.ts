import classEnrollmentRepo from "@/repositories/class-based-learning/classEnrollment.repo";

class ClassEnrollmentService {
    public async addStudentToClass(classId: number, studentId: number) {
        const result = await classEnrollmentRepo.addStudentToClass({ classId, studentId });
        return result;
    }
}

export default new ClassEnrollmentService();