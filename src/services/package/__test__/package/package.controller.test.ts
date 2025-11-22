/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { Request, Response } from 'express';
import { packageController } from '../../../../controllers/package/package.controller';
import { packageService } from '@/services/package/package.service';
import { SuccessResponse } from '@/core/success';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';

jest.mock;
// Mock dependencies
jest.mock('@/services/package/package.service');
jest.mock('@/core/success');
jest.mock('@/utils/auth/authHelpers.utils');

describe('PackageController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let next: jest.Mock;

    const mockUserId = 123;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        (getUserIdFromRequest as jest.Mock).mockReturnValue(mockUserId);
        jest.clearAllMocks();
    });

    describe('createNewPackage', () => {
        it('should create a new package successfully', async () => {
            const payload = { title: 'New Package', parentId: null };
            req.body = payload;
            const mockPackage = { id: 1, ...payload, userId: mockUserId };

            (packageService.createPackage as jest.Mock).mockResolvedValue(mockPackage);

            await packageController.createNewPackage(req as Request, res as Response);

            expect(getUserIdFromRequest).toHaveBeenCalledWith(req);
            expect(packageService.createPackage).toHaveBeenCalledWith({
                userId: mockUserId,
                title: payload.title,
                parentId: payload.parentId,
            });
            expect(SuccessResponse.created).toHaveBeenCalledWith(res, mockPackage, 'Package Created!');
        });
    });

    describe('getTopicBelongPackage', () => {
        it('should get topics belonging to a package', async () => {
            req.body = { packageId: 1 };
            const mockTopics = [{ topicId: 1, name: 'Topic 1' }];

            (packageService.getTopicsBelongPackage as jest.Mock).mockResolvedValue(mockTopics);

            await packageController.getTopicBelongPackage(req as Request, res as Response);

            expect(packageService.getTopicsBelongPackage).toHaveBeenCalledWith({
                packageId: 1,
                userId: mockUserId,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockTopics);
        });
    });

    describe('getTopicUnAssignedTopic', () => {
        it('should get unassigned topics', async () => {
            req.body = { packageId: 1, limit: 10, offset: 0 };
            const mockTopics = [{ topicId: 2, name: 'Unassigned Topic' }];

            (packageService.getTopicUnAssignedTopic as jest.Mock).mockResolvedValue(mockTopics);

            await packageController.getTopicUnAssignedTopic(req as Request, res as Response);

            expect(packageService.getTopicUnAssignedTopic).toHaveBeenCalledWith({
                packageId: 1,
                userId: mockUserId,
                limit: 10,
                offset: 0,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockTopics);
        });
    });

    describe('updatePackage', () => {
        it('should update a package successfully', async () => {
            req.body = { packageId: 1, title: 'Updated Title' };
            const mockUpdatedPackage = { id: 1, title: 'Updated Title', userId: mockUserId };

            (packageService.updatePackage as jest.Mock).mockResolvedValue(mockUpdatedPackage);

            await packageController.updatePackage(req as Request, res as Response);

            expect(packageService.updatePackage).toHaveBeenCalledWith({
                packageId: 1,
                title: 'Updated Title',
                userId: mockUserId,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockUpdatedPackage);
        });
    });

    describe('updateTopicInPackage', () => {
        it('should update topic in package successfully', async () => {
            req.body = { topicId: 1, packageId: 2 };
            const mockResult = { topicId: 1, packageId: 2 };

            (packageService.updateTopicInPackage as jest.Mock).mockResolvedValue(mockResult);

            await packageController.updateTopicInPackage(req as Request, res as Response);

            expect(packageService.updateTopicInPackage).toHaveBeenCalledWith({
                userId: mockUserId,
                topicId: 1,
                packageId: 2,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockResult);
        });
    });

    describe('removeTopicInPackage', () => {
        it('should remove topic from package successfully', async () => {
            req.body = { topicId: 1, packageId: 2 };
            const mockResult = [{ topicId: 1, packageId: null }];

            (packageService.removeTopicInPackage as jest.Mock).mockResolvedValue(mockResult);

            await packageController.removeTopicInPackage(req as Request, res as Response);

            expect(packageService.removeTopicInPackage).toHaveBeenCalledWith({
                topicId: 1,
                packageId: 2,
                userId: mockUserId,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockResult);
        });
    });

    describe('getPackages', () => {
        it('should get packages with default limit and offset', async () => {
            req.query = {};
            const mockPackages = [{ id: 1, title: 'Package 1' }];

            (packageService.getPackages as jest.Mock).mockResolvedValue(mockPackages);

            await packageController.getPackages(req as Request, res as Response);

            expect(packageService.getPackages).toHaveBeenCalledWith({
                userId: mockUserId,
                limit: 20,
                offset: 0,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockPackages);
        });

        it('should get packages with provided limit and offset', async () => {
            req.query = { limit: '10', offset: '5' };
            const mockPackages = [{ id: 1, title: 'Package 1' }];

            (packageService.getPackages as jest.Mock).mockResolvedValue(mockPackages);

            await packageController.getPackages(req as Request, res as Response);

            expect(packageService.getPackages).toHaveBeenCalledWith({
                userId: mockUserId,
                limit: 10,
                offset: 5,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, mockPackages);
        });
    });

    describe('deletePackage', () => {
        it('should delete a package successfully', async () => {
            req.body = { packageId: 1 };

            (packageService.deletePackage as jest.Mock).mockResolvedValue(undefined);

            await packageController.deletePackage(req as Request, res as Response);

            expect(packageService.deletePackage).toHaveBeenCalledWith({
                userId: mockUserId,
                packageId: 1,
            });
            expect(SuccessResponse.ok).toHaveBeenCalledWith(res, {}, 'Package Delete!');
        });
    });
});
