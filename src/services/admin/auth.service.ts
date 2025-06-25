import { adminAuthRepo } from '@/repositories/admin/auth.repo';
import { adminUserRepo } from '@/repositories/admin/user.repo';
import { NotFoundError } from '@/core/error';

class AdminAuthService {
  constructor() {}

  async getAuthAccounts(userId: number) {
    const user = await adminUserRepo.getUserById(userId);
    if(!user) throw new NotFoundError('User not found');

    return await adminAuthRepo.getAuthAccountsByUserId(userId);
  }
}

export const adminAuthService = new AdminAuthService();
