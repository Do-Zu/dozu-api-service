import  db from '@/libs/drizzleClient.lib';
import {usersTable} from '@/models/user.model';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '@/core/error';
import { GetUsersQueryDto } from '@/dtos/admin/getUsers.dto';
import { adminUserRepo } from '@/repositories/admin/user.repo';
import { UpdateUserRoleDto } from '@/dtos/admin/updateUserRole.dto';
import { userSubscriptionsTable, plansTable } from '@/models/subscription';
class AdminUserService {
    constructor() {}

    async getAllUsers(filters: GetUsersQueryDto) {
        const {role, isActive, isVerified, hasCompletedOnboarding, planType} = filters;
        const userConditions = [];

        if (role) userConditions.push(eq(usersTable.role, role));
        if (isActive !== undefined) userConditions.push(eq(usersTable.isActive, isActive));
        if (isVerified !== undefined) userConditions.push(eq(usersTable.isVerified, isVerified));
        if (hasCompletedOnboarding !== undefined)
           userConditions.push(eq(usersTable.hasCompletedOnboarding, hasCompletedOnboarding));

        // Build query with left join to get subscription info
        let query = db
            .select({
                userId: usersTable.userId,
                username: usersTable.username,
                email: usersTable.email,
                role: usersTable.role,
                isActive: usersTable.isActive,
                createdAt: usersTable.createdAt,
                planType: plansTable.planType,
                planName: plansTable.name,
                subscriptionStatus: userSubscriptionsTable.status,
                currentPeriodEnd: userSubscriptionsTable.currentPeriodEnd,
            })
            .from(usersTable)
            .leftJoin(
                userSubscriptionsTable,
                and(
                    eq(usersTable.userId, userSubscriptionsTable.userId),
                    eq(userSubscriptionsTable.status, 'active')
                )
            )
            .leftJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId));

        // Apply user conditions
        if (userConditions.length > 0) {
            query = query.where(and(...userConditions)) as any;
        }

        const users = await query;

        // Filter by planType if specified
        if (planType) {
            return users.filter(user => user.planType === planType);
        }

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