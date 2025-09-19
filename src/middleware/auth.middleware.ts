import { NextFunction, Request, Response } from 'express';

//attaches user object to request

import jwt from 'jsonwebtoken';
import logger from '@/utils/logger';
import { AuthenticationError, BadRequest, Forbidden } from '@/core/error';
import { getUserRolesFromRequest } from '@/utils/auth/authHelpers.utils';
import { DecodedTokenPayload } from '@/types/auth/jwtPayload.type';

const SECRET = process.env.JWT_SECRET; // make sure to use env vars in production

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!accessToken) {
        throw new AuthenticationError('Access token is required');
    }
    if (!SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    try {
        console.log(accessToken, 'accessTOken');
        const decoded: any = jwt.verify(accessToken, SECRET);
        //.verify Validates expiration by default

        req.currentUser = decoded; // add `user` to Request via type augmentation

        next();
    } catch (error) {
        console.log(error);
        logger.warn('Invalid token');
        throw new AuthenticationError('Unauthorized: Invalid token');
    }
};

export const validateStudent = async (req: Request, res: Response, next: NextFunction) => {
    const roles = await getUserRolesFromRequest(req);
    const isStudent = roles.length === 1 && roles[0].name === 'user';
    if (isStudent) {
        next();
    } else {
        const message = 'Forbidden: Require Student role to access the resources';
        logger.warn(message);
        throw new Forbidden(message);
    }
};

export const validateTeacher = async (req: Request, res: Response, next: NextFunction) => {
    const roles = await getUserRolesFromRequest(req);
    const isTeacher = roles.find(role => role.name === 'teacher');
    if (isTeacher) {
        next();
    } else {
        const message = 'Forbidden: Require teacher to access the resources';
        logger.warn(message);
        throw new Forbidden(message);
    }
};

export const validateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const roles = await getUserRolesFromRequest(req);
    const isAdmin = roles.find(role => role.name === 'admin');
    if (isAdmin) {
        next();
    } else {
        const message = 'Forbidden: Require admin to access the resources';
        logger.warn(message);
        throw new Forbidden(message);
    }
};

export const authMiddlewareIfHeadersPresent = async (req: Request, res: Response, next: NextFunction) => {
    //todo - DuyND: What the fuck, reread again later.
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!accessToken) {
        next(); //skips verifying if user is not logged in, for use with endpoints where you can optionally use as guest - DuyND
    } else if (!SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    } else {
        try {
            const decoded = jwt.verify(accessToken, SECRET) as DecodedTokenPayload;
            //.verify Validates expiration by default

            req.currentUser = decoded; // add `user` to Request via type augmentation

            next();
        } catch (error) {
            //!remove console.log with proper logger
            console.log(error);
            logger.warn('Invalid token');
            throw new BadRequest('Unauthorized: Invalid token');
        }
    }
};
