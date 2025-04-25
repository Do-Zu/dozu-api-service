import { NextFunction, Request, RequestHandler, Response } from 'express';

//attaches user object to request

import jwt from 'jsonwebtoken';
import { asyncHandler } from './handler/handler.v2';
import logger from '@/utils/logger';
import { BadRequest } from '@/core/error';


const SECRET = process.env.JWT_SECRET || 'dev-secret'; // make sure to use env vars in production

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    throw new BadRequest('Access token is required');
  }

  try {
    const decoded: any = jwt.verify(accessToken, SECRET);
    //.verify Validates expiration by default
    //todo: enforce type for decoded
    // You can attach decoded data to the request for downstream use
    req.currentUser = decoded; // add `user` to Request via type augmentation

    next();
  } catch (error) {
    logger.warn('Invalid token');
    throw new BadRequest('Unauthorized: Invalid token');
    // return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
