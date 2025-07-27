import { Forbidden } from "@/core/error";
import classService from "@/services/class-based-learning/class.service";
import classEnrollmentService from "@/services/class-based-learning/classEnrollment.service";
import { getUserIdFromRequest, isTeacher } from "@/utils/auth/authHelpers.utils";
import logger from "@/utils/logger";
import { NextFunction, Request, Response } from "express";

class ClassMiddleware {
    public async verifyStudentInClass(req: Request, res: Response, next: NextFunction) {
        const userId = getUserIdFromRequest(req);
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        const result = await classEnrollmentService.isStudentInClass(classId, userId);
        if(result) {
            next();
        } else {
            const message = 'Forbidden: You do not belong to this class!';
            logger.warn(message);
            throw new Forbidden(message);
        }
    }

    public async verifyTeacherOwnsClass(req: Request, res: Response, next: NextFunction) {
        const userId = getUserIdFromRequest(req);
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);

        const result = await classService.isTeacherOwnerOfClass(classId, userId);
        if(result) {
            next();
        } else {
            const message = 'Forbidden: You are not the owner of this class!';
            logger.warn(message);
            throw new Forbidden(message);
        }
    }

    // for both students and teachers
    public async verifyUserCanAccessClass(req: Request, res: Response, next: NextFunction) {
        const teacher = await isTeacher(req);
        if(teacher) {
            return this.verifyTeacherOwnsClass(req, res, next);
        } else {
            return this.verifyStudentInClass(req, res, next);
        }
    }
}

export default new ClassMiddleware();