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
}

export default new ClassEnrollmentController();
