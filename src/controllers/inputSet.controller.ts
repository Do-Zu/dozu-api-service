import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { getDocumentService } from '@/services/inputSet/inputSet.service';
import { Response, Request } from 'express';

export const getInputSetDocumentController = async (req: Request, res: Response) => {
    const topicId = parseInt(req.params.topicId);

    if (!topicId) {
        throw new BadRequest('topicId is required');
    }

    const inputSetDocumentData = await getDocumentService(topicId);

    if (!inputSetDocumentData) {
        throw new Error('Error: Document does not exist');
    }

    SuccessResponse.ok(res, inputSetDocumentData, 'Input set document retrieved successfully');
};
