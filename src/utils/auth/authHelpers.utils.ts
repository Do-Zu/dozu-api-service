import { getUserRoles } from '@/repositories/auth.repo';
import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import { Request } from 'express';
import { getDateFormatted } from '../date';
import { UserLoginDataResponse } from '@/services/auth.service';

export const sanitizeUserObject = (userData: UserLoginDataResponse): SanitizedUser => {
    const returnData = {
        userId: userData.userId,
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        avatarUrl: userData.avatarUrl,
        isNewUser: userData.isNewUser,
        hasCompletedOnboarding: !!userData?.preferences && userData?.hasCompletedOnboarding,
        createdAt: userData?.createdAt ? getDateFormatted(userData?.createdAt) : null,
        lastLoginAt: userData?.lastLoginAt ? getDateFormatted(userData?.lastLoginAt) : null,
        permissions: [],
        roles: userData.roles,
        isActive: userData.isActive,
    } as SanitizedUser;

    return returnData;
};

export const getUserIdFromRequest = (req: Request): number => {
    const user = req.currentUser;
    let { userId } = user as { userId: string | number };
    userId = parseInt(userId as string);
    return userId;
};

export const getUserRolesFromRequest = async (req: Request): Promise<{ roleId: number; name: string }[]> => {
    const userId = getUserIdFromRequest(req);
    const userRoles = await getUserRoles(userId);
    return userRoles;
};

export const isTeacher = async (req: Request): Promise<boolean> => {
    const roles = await getUserRolesFromRequest(req);
    return roles.find(role => role.name === 'teacher') !== undefined;
};
