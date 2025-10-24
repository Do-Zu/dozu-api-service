import { packageRepo } from '@/repositories/package/package.repo';
import { isNilOrEmpty } from '@/utils/common';
import { InternalServerError, NotFoundError } from '@/core/error';

/**
 * Service class for Package functionality
 */
class PackageService {
    public async createPackage(params: { userId: number; title: string; parentId?: number | null }) {
        return await packageRepo.createPackage(params);
    }

    public async getTopicsBelongPackage(params: { packageId: number }) {
        const topics = await packageRepo.getTopicsByPackageId(params.packageId);
        if (isNilOrEmpty(topics)) {
            throw new NotFoundError('Package not found or access denied');
        }
        return topics;
    }

    public async getTopicUnAssignedTopic(params: { packageId: number; userId: number; limit: number; offset: number }) {
        const topics = await packageRepo.getTopicUnAssignedTopic(params);

        if (isNilOrEmpty(topics)) {
            throw new NotFoundError();
        }
        return topics;
    }

    public async updatePackage(params: { packageId: number; userId: number; title: string }) {
        const result = await packageRepo.updatePackage(params);
        if (isNilOrEmpty(result)) {
            throw new InternalServerError('Update Package Fail');
        }
        return result;
    }

    public async updateTopicInPackage(params: { userId: number; topicId: number; packageId: number | null }) {
        return packageRepo.updateTopicInPackage(params);
    }

    public async removeTopicInPackage(params: { topicId: number; packageId: number; userId: number }) {
        return packageRepo.removeTopicInPackage(params);
    }

    public async getPackages(params: { userId: number; limit: number; offset: number }) {
        return packageRepo.getPackagesByUser(params);
    }

    public async deletePackage(params: { userId: number; packageId: number }): Promise<void> {
        await packageRepo.deletePackageById(params);
    }
}

export const packageService = new PackageService();
