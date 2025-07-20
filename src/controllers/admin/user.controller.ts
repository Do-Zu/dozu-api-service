import { Request, Response } from 'express';
import { adminUserService } from '@/services/admin/user.service';
import { SuccessResponse } from '@/core/success';
class AdminUserController {
    constructor() {}

    async handleGetAllUsers(req: Request, res: Response) {
        const users = await adminUserService.getAllUsers(req.query);
        SuccessResponse.ok(res, users, 'Fetched users successfully');
    };

    async handleToggleUserActive(req: Request, res: Response) {
        const {id} = req.params;
        const updatedUser = await adminUserService.tonggleUserActive(Number(id));
        SuccessResponse.ok(res, updatedUser, 'Toggled user active state successfully');
    };

    async handleUpdateUserRole(req: Request, res: Response) {
        const {id} = req.params;
        const result = await adminUserService.updateUserRole(Number(id), req.body);
        SuccessResponse.ok(res, result, 'Updated user role successfully');
    };

    async handleGetUserStats(req: Request, res: Response) {
        const result = await adminUserService.getUserStats();
        SuccessResponse.ok(res, result, 'Fetched user statistics');
    };
}

export const adminUserController = new AdminUserController();