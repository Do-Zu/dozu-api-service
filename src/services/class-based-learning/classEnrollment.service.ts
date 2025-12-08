import db from '@/libs/drizzleClient.lib';
import classEnrollmentRepo from '@/repositories/class-based-learning/classEnrollment.repo';
import { IStudentInClass } from '@/types/class-based-learning/classEnrollment.type';
import classTopicService from './classTopic.service';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';

class ClassEnrollmentService {
    public async addStudentToClass(classId: number, studentId: number) {
        const result = await classEnrollmentRepo.addStudentToClass({ classId, studentId });
        return result;
    }

    public async removeStudentFromClass(classId: number, studentId: number): Promise<void> {
        const enrollment = await classEnrollmentRepo.getEnrollmentByClassAndStudent(classId, studentId);
        const topics = await classTopicService.getTopicsInClassForTeacher(classId);
        const topicIds = topics.map(topic => topic.topicId);

        await db.transaction(async tx => {
            await itemSpacedRepetitionTrackingRepo.deleteTrackingRecordsByTopicsAndUser(
                { topicIds, userId: studentId },
                tx
            );
            await classEnrollmentRepo.removeStudentFromClass(enrollment.classEnrollmentId);
        });
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
