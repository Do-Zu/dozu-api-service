import { NextFunction, Request, Response } from 'express';

//attaches user object to request

import jwt from 'jsonwebtoken';
import { asyncHandler } from './handler/handler.v2';
import logger from '@/utils/logger';
import { BadRequest } from '@/core/error';
import { sanitizeUserObject } from '@/utils/auth/authHelpers.utils';

const SECRET = process.env.JWT_SECRET || 'dev-secret'; // make sure to use env vars in production

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!accessToken) {
    throw new BadRequest('Access token is required');
  }

  try {
    const decoded: any = jwt.verify(accessToken, SECRET);
    const sanitizedUser = sanitizeUserObject(decoded.user);
    //.verify Validates expiration by default
    //todo: enforce type for decoded

    req.currentUser = sanitizedUser; // add `user` to Request via type augmentation

    next();
  } catch (error) {
    console.log(error);
    logger.warn('Invalid token');
    throw new BadRequest('Unauthorized: Invalid token');
  }
};
