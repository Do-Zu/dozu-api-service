import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { inputSetService } from '@/services/inputSet/inputSet.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { Response, Request } from 'express';

class InputSetController {
    public getInputSetDocumentController = async (req: Request, res: Response) => {
        const topicId = parseInt(req.params.topicId);

        if (!topicId) {
            throw new BadRequest('topicId is required');
        }

        const inputSetDocumentData = await inputSetService.getDocumentService(topicId);

        SuccessResponse.ok(res, inputSetDocumentData, 'Input set document retrieved successfully');
    };

    public insertResource = async (req: Request, res: Response) => {
        const userId = getUserIdFromRequest(req);

        const payload = req.body;

        const result = await inputSetService.handleInsertResource({ ...payload, userId });

        SuccessResponse.created(res, result);
    };
}

export const inputSetController = new InputSetController();
