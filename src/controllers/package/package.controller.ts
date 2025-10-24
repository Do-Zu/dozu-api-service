import { Request, Response } from 'express';
import { packageService } from '@/services/package/package.service';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';

/**
 * Controller class for Package functionality
 */
class PackageController {
    public createNewPackage = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const payload = req.body;

        const { title, parentId } = payload;

        const newPackage = await packageService.createPackage({ userId, title, parentId });

        SuccessResponse.created(res, newPackage, 'Package Created!');
    };

    public getTopicBelongPackage = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { packageId } = req.body;

        const topics = await packageService.getTopicsBelongPackage({ packageId, userId });

        SuccessResponse.ok(res, topics);
    };

    public getTopicUnAssignedTopic = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { packageId, limit, offset } = req.body;

        const topics = await packageService.getTopicUnAssignedTopic({ packageId, userId, limit, offset });

        SuccessResponse.ok(res, topics);
    };

    public updatePackage = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { packageId, title } = req.body;

        const updatedPackage = await packageService.updatePackage({ packageId, title, userId });

        SuccessResponse.ok(res, updatedPackage);
    };

    public updateTopicInPackage = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { topicId, packageId } = req.body;

        const result = await packageService.updateTopicInPackage({ userId, topicId, packageId });

        SuccessResponse.ok(res, result);
    };

    public removeTopicInPackage = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { topicId, packageId } = req.body;

        const result = await packageService.removeTopicInPackage({ topicId, packageId, userId });

        SuccessResponse.ok(res, result);
    };

    public getPackages = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { limit, offset } = req.query;

        const defaultLimit = 20;
        const defaultOffset = 0;

        const limitQ = parseInt((limit ?? defaultLimit) as string);
        const offsetQ = parseInt((offset ?? defaultOffset) as string);

        const packages = await packageService.getPackages({ userId, limit: limitQ, offset: offsetQ });

        SuccessResponse.ok(res, packages);
    };

    public deletePackage = async (req: Request, res: Response): Promise<void> => {
        const userId = getUserIdFromRequest(req);

        const { packageId } = req.body;

        await packageService.deletePackage({ userId, packageId });

        SuccessResponse.ok(res, {}, 'Package Delete!');
    };
}

export const packageController = new PackageController();
