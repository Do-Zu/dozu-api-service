import { BadRequest, Forbidden } from '@/core/error';
import requestHelper from '@/core/request/request.helper';
import classService from '@/services/class-based-learning/class.service';
import classEnrollmentService from '@/services/class-based-learning/classEnrollment.service';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';

class ClassMiddleware {
    public verifyStudentInClass = async (req: Request, res: Response, next: NextFunction) => {
        const userId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');

        const result = await classEnrollmentService.isStudentInClass(classId, userId);
        if (result) {
            next();
        } else {
            const message = 'Forbidden: You do not belong to this class!';
            logger.warn(message);
            throw new Forbidden(message);
        }
    };

    public verifyTeacherOwnsClass = async (req: Request, res: Response, next: NextFunction) => {
        const userId = getUserIdFromRequest(req);
        const classId = requestHelper.getIdParam(req, 'classId');

        const result = await classService.isTeacherOwnerOfClass(classId, userId);
        if (result) {
            next();
        } else {
            const message = 'Forbidden: You are not the owner of this class!';
            logger.warn(message);
            throw new Forbidden(message);
        }
    };

    // for both students and teachers
    public verifyUserCanAccessClass = async (req: Request, res: Response, next: NextFunction) => {
        const teacher = await isTeacher(req);
        if (teacher) {
            return this.verifyTeacherOwnsClass(req, res, next);
        } else {
            return this.verifyStudentInClass(req, res, next);
        }
    };

    public verifyClassById = async (req: Request, res: Response, next: NextFunction) => {
        const classId = requestHelper.getIdParam(req, 'classId');
        const myClass = await classService.getClassById(classId);
        if (myClass) {
            requestHelper.setResource(req, 'class', myClass);
            next();
        } else {
            throw new BadRequest('Class is invalid!');
        }
    };
}

export default new ClassMiddleware();
