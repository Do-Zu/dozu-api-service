import { getUserRoles } from '@/repositories/auth.repo';
import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import { Request } from 'express';

export const sanitizeUserObject = (userData: any): SanitizedUser => {
  const returnData = {
    userId: userData.userId,
    username: userData.username,
    email: userData.email,
    fullName: userData.fullName,
    avatarUrl: userData.avatarUrl,
    isNewUser: userData.isNewUser,
    hasCompletedOnboarding: userData.hasCompletedOnboarding,
    createdAt: userData.createdAt,
    lastLoginAt: userData.lastLoginAt,
    permissions: [],
    roles: userData.roles,
  
  };
  return returnData;
};


// export const getUserFromRequest = (request: Request): SanitizedUser => {
//   return request.currentUser;
// };

export const getUserIdFromRequest = (req: Request): number => {
  const user = req.currentUser;
  let { userId } = user as { userId: string | number };
  userId = parseInt(userId as string);
  return userId;
};

export const getUserRolesFromRequest = async (req: Request): Promise<{ roleId: number, name: string }[]> => {
  const userId = getUserIdFromRequest(req);
  const userRoles = await getUserRoles(userId);
  return userRoles;
}

export const isTeacher = async(req: Request): Promise<boolean> => {
  const roles = await getUserRolesFromRequest(req);
  return roles.find((role) => role.name === 'teacher') !== undefined;
}