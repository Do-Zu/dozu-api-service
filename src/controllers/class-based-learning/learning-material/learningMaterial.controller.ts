import { Request, Response } from 'express';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import requestHelper from '@/core/request/request.helper';
import {
    createLearningMaterialService,
    deleteLearningMaterialService,
    getLearningMaterialService,
    getLearningMaterialsOfClassService,
} from '@/services/class-based-learning/learning-material/learningMaterial.service';

export const createLearningMaterialController = async (req: Request, res: Response) => {
    if (!req.body || !req.body.title) {
        throw new BadRequest('Invalid request');
    }

    const { title, content, topicId, inputResources } = req.body;

    const classId = requestHelper.getIdParam(req, 'classId');

    if (!classId) {
        throw new BadRequest('Missing class id');
    }

    const data = await createLearningMaterialService({
        title,
        content: content ?? '',
        classId,
        topicId,
        inputResources,
    });
    if (data.success) {
        const returnData = {
            ...data.learningMaterialWithAttachments,
        };
        SuccessResponse.ok(res, returnData);
    } else {
        throw new BadRequest('Invalid request');
    }
};

export const getLearningMaterialController = async (req: Request, res: Response) => {
    const learningMaterialIdParam = req.params.learningMaterialId;

    if (!learningMaterialIdParam) {
        throw new BadRequest('Missing learning material id');
    }

    const learningMaterialId = parseInt(learningMaterialIdParam);

    const data = await getLearningMaterialService({
        learningMaterialId: learningMaterialId,
    });
    if (data.success) {
        const returnData = {
            ...data.learningMaterialWithAttachments,
        };
        SuccessResponse.ok(res, returnData);
    } else {
        throw new BadRequest('Invalid request');
    }
};

export const getLearningMaterialsOfClassController = async (req: Request, res: Response) => {
    const classId = requestHelper.getIdParam(req, 'classId');

    const data = await getLearningMaterialsOfClassService({
        classId: classId,
    });
    if (data.success) {
        const returnData = {
            data,
        };
        SuccessResponse.ok(res, returnData);
    } else {
        throw new BadRequest('Invalid request');
    }
};

export const deleteLearningMaterialController = async (req: Request, res: Response) => {
    const learningMaterialIdParam = req.params.learningMaterialId;

    if (!learningMaterialIdParam) {
        throw new BadRequest('Missing learning material id');
    }

    const learningMaterialId = parseInt(learningMaterialIdParam);

    const data = await deleteLearningMaterialService({
        learningMaterialId: learningMaterialId,
    });
    if (data.success) {
        const returnData = {
            deletedLearningMaterialId: data.deletedLearningMaterialId,
        };
        SuccessResponse.ok(res, returnData);
    } else {
        throw new BadRequest('Invalid request');
    }
};
