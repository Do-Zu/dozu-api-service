import { Request, Response } from 'express';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import requestHelper from '@/core/request/request.helper';
import {
    editLearningMaterialService,
    deleteLearningMaterialService,
    getLearningMaterialService,
    getLearningMaterialsOfClassService,
    createLearningMaterialService,
} from '@/services/class-based-learning/learning-material/learningMaterial.service';
import { IUpdateLearningMaterialBody } from '@/types/class-based-learning/learning-material/learningMaterial.type';

export const createLearningMaterialController = async (req: Request, res: Response) => {
    if (!req.body || !req.body.title) {
        throw new BadRequest('Invalid request');
    }

    const { title, content, topicId, inputResources, urls } = req.body;

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
        urls,
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

export const updateLearningMaterialController = async (req: Request, res: Response) => {
    const classId = requestHelper.getIdParam(req, 'classId');
    const learningMaterialId = parseInt(req.params.learningMaterialId);
    if (Number.isNaN(learningMaterialId)) {
        throw new BadRequest('Missing learning material id');
    }
    const requestBodyData = req.body as IUpdateLearningMaterialBody;
    const updatedLearningMaterial = {
        ...requestBodyData,
        classId,
        learningMaterialId: learningMaterialId,
        content: requestBodyData.content ?? '',
        topicId: requestBodyData.topicId ?? null,
        urls: requestBodyData.urls ?? [],
    };

    // handle edit
    const data = await editLearningMaterialService({
        learningMaterial: updatedLearningMaterial,
        inputResources: requestBodyData.inputResources,

    });
    if (data.success) {
        const returnData = {
            data: data.learningMaterialWithAttachments,
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
