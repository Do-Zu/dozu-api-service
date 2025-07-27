import { DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import classService from '@/services/class-based-learning/class.service';
import classEnrollmentService from '@/services/class-based-learning/classEnrollment.service';
import { IJoinClassBody } from '@/types/class-based-learning/classEnrollment.type';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import { IClass } from '@/types/class-based-learning/class.type';
import profileService from '@/services/profile/profile.service';

class ClassEnrollmentController {
    public async joinClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        let { invitationCode } = req.body as IJoinClassBody;

        const myClass = (await classService.getClassByInvitationCode(invitationCode)) as IClass & { teacherId: number };

        let result: IClass;
        try {
            const enrollment = await classEnrollmentService.addStudentToClass(myClass.classId, userId);
            const teacher = await profileService.getProfile(myClass.teacherId);

            const { userId: teacherId, fullName: teacherName, avatarUrl: teacherImageUrl } = teacher;
            result = {
                ...myClass,
                classEnrollmentId: enrollment.classEnrollmentId,
                enrolledAt: enrollment.enrolledAt,
                teacherId,
                teacherName,
                teacherImageUrl,
            };
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.created(res, result);
    }

    public async leaveClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);

        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        await classEnrollmentService.removeStudentFromClass(classId, userId);

        SuccessResponse.noContent(res);
    }

    public async removeStudentFromClass(req: Request, res: Response) {
        let { studentId, classId } = req.params as { studentId: string | number; classId: string | number };

        studentId = Number(studentId as string);
        classId = Number(classId as string);

        await classEnrollmentService.removeStudentFromClass(classId, studentId);

        SuccessResponse.noContent(res);
    }
}

export default new ClassEnrollmentController();
