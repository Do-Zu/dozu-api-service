import { NotFoundError } from '@/core/error';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { Request, Response } from 'express';
import { IClass, ICreateClassBody, IUpdateClassBody } from '@/types/class-based-learning/class.type';
import { SuccessResponse } from '@/core/success';
import classService from '@/services/class-based-learning/class.service';
import requestHelper from '@/core/request/request.helper';
import { deleteImage, uploadImage } from '@/libs/cloudinary.lib';
import { extractPublicId } from 'cloudinary-build-url';

class ClassController {
    public async getClassById(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');

        const result: IClass | undefined = await classService.getClassById(classId);
        if (!result) {
            throw new NotFoundError('Class Not Found');
        }

        SuccessResponse.ok(res, result);
    }

    public async getClassesForStudent(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const classes: IClass[] = await classService.getClassesForStudent(userId);
        SuccessResponse.ok(res, classes);
    }

    public async getClassesForTeacher(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const classes: IClass[] = await classService.getClassesForTeacher(userId);
        SuccessResponse.ok(res, classes);
    }

    public async createClassForTeacher(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const { name, description } = req.body as ICreateClassBody;

        const imageFile = req.file;

        let imageUrl: string | null = null;
        if (imageFile) {
            const imageObject = await uploadImage(imageFile.buffer);
            if (!imageObject) {
                throw new Error('Cannot upload image');
            }
            imageUrl = imageObject.secure_url;
        }

        const result = await classService.createClassForTeacher(userId, { name, description, imageUrl });
        SuccessResponse.created(res, result);
    }

    public async updateClassById(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const { name, description } = req.body as IUpdateClassBody;
        const imageFile = req.file;
        const myClass = await classService.getClassById(classId);
        if(!myClass) {
            throw new NotFoundError('Class not found');
        }

        let imageUrl: string | null = null;
        if (imageFile) {
            if (myClass.imageUrl) {
                // delete old image of topic
                await deleteImage(extractPublicId(myClass.imageUrl));
            }
            // upload new image
            const imageObject = await uploadImage(imageFile.buffer);
            if (!imageObject) {
                throw new Error('Cannot upload image');
            }
            imageUrl = imageObject.secure_url;
        }

        const result = await classService.updateClassById(classId, { name, description, imageUrl });

        SuccessResponse.ok(res, result);
    }
}

export default new ClassController();
