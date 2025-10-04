import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { adminAuthService } from '@/services/admin/auth.service';

class AdminAuthController {
  constructor() {}

  async handleGetUserAuthAccounts(req: Request, res: Response) {
    const userId = Number(req.params.id);
    const result = await adminAuthService.getAuthAccounts(userId);
    SuccessResponse.ok(res, result, 'Fetched linked accounts successfully');
  }
}

export const adminAuthController = new AdminAuthController();
