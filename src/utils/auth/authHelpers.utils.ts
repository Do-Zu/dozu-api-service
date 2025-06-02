import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import { Request } from 'express';

export const sanitizeUserObject = (userData: any): SanitizedUser => {
  const returnData = {
    userId: userData.userId,
    username: userData.username,
    email: userData.email,
    fullName: userData.fullName,
    avatarUrl: userData.avatarUrl,
  };
  return returnData;
};

export const getUserFromRequest = (request: Request): SanitizedUser => {
  return request.currentUser;
};
