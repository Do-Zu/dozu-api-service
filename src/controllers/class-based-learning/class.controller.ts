import { BadRequest, DatabaseError, NotFoundError } from '@/core/error';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import { IClass, ICreateClassBody, IUpdateClassBody } from '@/types/class-based-learning/class.type';
import { SuccessResponse } from '@/core/success';
import classService from '@/services/class-based-learning/class.service';

class ClassController {

    public async getClassById(req: Request, res: Response) {
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);
        if (isNaN(classId)) {
            throw new BadRequest('Invalid param, cannot get class');
        }

        let result : IClass | undefined;
        try {
            result = await classService.getClassById(classId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        if(!result) {
            throw new NotFoundError('Class Not Found');
        }

        SuccessResponse.ok(res, result);
    }

    public async getClassesForUser(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        let classes: IClass[];
        const teacher = await isTeacher(req);
        try {
            if (teacher) {
                classes = await classService.getClassesForTeacher(userId);
            } else {
                classes = await classService.getClassesForStudent(userId);
            }
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, classes);
    }

    public async createClassForUser(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const { name, description } = req.body as ICreateClassBody;
        let result;
        try {
            result = await classService.createClassForUser(userId, { name, description });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.created(res, result);
    }

    public async updateClassById(req: Request, res: Response) {
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);
        if (isNaN(classId)) {
            throw new BadRequest('Invalid param, cannot update class');
        }

        const { name, description } = req.body as IUpdateClassBody;

        let result;
        try {
            result = await classService.updateClassById(classId, { name, description });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, result);
    }
}

export default new ClassController();
