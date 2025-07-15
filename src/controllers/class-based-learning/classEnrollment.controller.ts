import { DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import classService from "@/services/class-based-learning/class.service";
import classEnrollmentService from "@/services/class-based-learning/classEnrollment.service";
import { IJoinClassBody } from "@/types/class-based-learning/classEnrollment.type";
import { getUserIdFromRequest } from "@/utils/auth/authHelpers.utils";
import logger from "@/utils/logger";
import { Request, Response } from "express";

class ClassEnrollmentController {
    public async joinClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        let { invitationCode } = req.body as IJoinClassBody;

        const myClass = await classService.getClassByInvitationCode(invitationCode);

        let result;
        try {
            const enrollment = await classEnrollmentService.addStudentToClass(myClass.classId, userId);
            result = { ...myClass, classEnrollmentId: enrollment.classEnrollmentId, enrolledAt: enrollment.enrolledAt };
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.created(res, result);
    }
}

export default new ClassEnrollmentController();