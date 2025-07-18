import  db from '@/libs/drizzleClient.lib';
import {usersTable} from '@/models/user.model';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@/core/error';
import { GetUsersQueryDto } from '@/dtos/admin/getUsers.dto';
import { adminUserRepo } from '@/repositories/admin/user.repo';
import { UpdateUserRoleDto } from '@/dtos/admin/updateUserRole.dto';
class AdminUserService {
    constructor() {}

    async getAllUsers(filters: GetUsersQueryDto) {
        const {role, isActive, isVerified, hasCompletedOnboarding} = filters;
        const conditions = [];

        if (role) conditions.push(eq(usersTable.role, role));
        if (isActive !== undefined) conditions.push(eq(usersTable.isActive, isActive));
        if (isVerified !== undefined) conditions.push(eq(usersTable.isVerified, isVerified));
        if (hasCompletedOnboarding !== undefined)
           conditions.push(eq(usersTable.hasCompletedOnboarding, hasCompletedOnboarding));

        const users = await db.select().from(usersTable).where(and(...conditions));

        return users;
    };

    async tonggleUserActive(userId: number) {
        const user = await adminUserRepo.getUserById(userId);
        if(!user) throw new NotFoundError('User not found');

        const updated = await adminUserRepo.updateUserActive(userId, !user.isActive);
        return updated;
    };

    async updateUserRole(userId: number, payload: UpdateUserRoleDto) {
        const user = await adminUserRepo.getUserById(userId);
        if (!user) throw new NotFoundError('User not found');

        return await adminUserRepo.updateUserRole(userId, payload.role);
    };

    async getUserStats() {
        return await adminUserRepo.countUserStats();
    };


    
}

export const adminUserService = new AdminUserService;