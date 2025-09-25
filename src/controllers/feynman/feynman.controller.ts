import { Request, Response } from 'express';
import { feynmanService } from '@/services/feynman/feynman.service';
import { SuccessResponse } from '@/core/success';
import { FeynmanSessionSavePayload } from '@/types/feynman/feynman.type';

/**
 * Controller class for Feynman functionality
 */
class FeynmanController {
    public getFeynmanSession = async (req: Request, res: Response) => {
        const { topicId, method } = req.body;
        const response = await feynmanService.getFeynmanSession({ topicId, method });
        SuccessResponse.ok(res, response);
    };

    public storageSessionFeynman = async (req: Request, res: Response) => {
        const payload = req.body as FeynmanSessionSavePayload;
        const response = await feynmanService.storageSessionFeynman(payload);
        SuccessResponse.ok(res, response);
    };

    public updateReview = async (req: Request, res: Response) => {
        const { topicId, method, review } = req.body;
        await feynmanService.updateReview({ topicId, method, review });
        SuccessResponse.created(res, {});
    };

    public updateSession = async (req: Request, res: Response) => {
        const payload = req.body;
        await feynmanService.updateSession(payload);
        SuccessResponse.ok(res, {});
    };
}

export const feynmanController = new FeynmanController();
