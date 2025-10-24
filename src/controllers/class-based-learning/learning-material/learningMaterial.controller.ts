import { Request, Response } from 'express';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import requestHelper from '@/core/request/request.helper';
import { createLearningMaterialService } from '@/services/class-based-learning/learning-material/learningMaterial.service';

export const createLearningMaterialController = async (req: Request, res: Response) => {
    // const topicId = parseInt(req.params.topicId);
    if (!req.body || !req.body.title) {
        throw new BadRequest('Invalid request');
    }

    const { title, description, topicId, inputResources } = req.body;

    const classId = requestHelper.getIdParam(req, 'classId');

    if (!classId) {
        throw new BadRequest('Missing class id');
    }

    const data = await createLearningMaterialService({
        title,
        description: description ?? '',
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
