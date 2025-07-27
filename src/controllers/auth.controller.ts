import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import {
    googleOAuthLoginService,
    loginService,
    registerUserService,
    verifyEmailService,
} from '@/services/auth.service';

import { AuthenticationError, BadRequest } from '@/core/error';
import { signAccessJwtToken, signRefreshJwtToken } from '@/utils/auth/jwt.utils';
import { sanitizeUserObject } from '@/utils/auth/authHelpers.utils';
import jwt from 'jsonwebtoken';

const frontEndBaseUrl = process.env.FRONTEND_BASE_URL;
const SECRET = process.env.JWT_SECRET;

export const testingAuthPath = async (req: Request, res: Response) => {
    // const data = await handleServiceDemo(req.body);
    SuccessResponse.ok(res, { message: 'Auth running' });
};

export const registerUserController = async (req: Request, res: Response) => {
    if (!req.body.username || !req.body.password || !req.body.email) {
        throw new BadRequest('Username, password and email are required');
    }
    const data = await registerUserService(req.body.username, req.body.password, req.body.email);
    const sanitizedUser = sanitizeUserObject(data.user);
    const accessToken = signAccessJwtToken(sanitizedUser);

    const returnData = {
        ...sanitizedUser,
        isNewUser: true,
        accessToken,
    };
    SuccessResponse.created(res, returnData);
};

export const loginController = async (req: Request, res: Response) => {
    if (!req.body.username || !req.body.password) {
        throw new BadRequest('Both username and password are required');
    }

    const username = req.body.username;
    const password = req.body.password;
    const data = await loginService(username, password);
    if (!data.success) {
        throw new AuthenticationError(data.reason);
    }
    if (!data.user.isActive) {
        //checks if user is banned
        throw new AuthenticationError('Account is disabled');
    }
    //add cookie and more
    const sanitizedUser = sanitizeUserObject(data.user);
    const accessToken = signAccessJwtToken(sanitizedUser);
    const refreshToken = signRefreshJwtToken(sanitizedUser);

    res.cookie('refreshToken', refreshToken, {
        // httpOnly: true,
        // secure: false, // ❌ Set to true in production (HTTPS)
        // sameSite: 'none',
    });

    const returnData = {
        ...sanitizedUser,
        isNewUser: false,
        refreshToken,
        accessToken,
    };

    SuccessResponse.ok(res, returnData);
};

export const logoutController = async (req: Request, res: Response) => {
    //?Consider blacklist if more security is wanted
    res.clearCookie('refreshToken');
    SuccessResponse.ok(res, {}); //todo:check if empty data is ok
};

export const refreshTokenController = async (req: Request, res: Response) => {
    //?Consider blacklist if more security is wanted
    //todo:delete refresh token when it is implemented
    const refreshToken = req.cookies.refreshToken;
    if (!SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    if (!refreshToken) {
        throw new BadRequest('Refresh token is required');
    }
    try {
        const decoded: any = jwt.verify(refreshToken, SECRET);

        const sanitizedUser = sanitizeUserObject(decoded.user);
        //.verify Validates expiration by default
        //todo: enforce type for decoded
        //todo: requery by userId
        const accessToken = signAccessJwtToken(sanitizedUser);
        const returnData: any = sanitizedUser;
        returnData.accessToken = accessToken;
        SuccessResponse.ok(res, returnData);
    } catch {
        throw new BadRequest('Unauthorized: Invalid token');
    }
    // SuccessResponse.ok(res, {}); //todo:check if empty data is ok
};

export const verifyEmailController = async (req: Request, res: Response) => {
    if (!req.query.email || !req.query.verificationCode) {
        throw new BadRequest('Bad link');
        //todo: alternatively navigate to UI with error code
    }
    const email = req.query.email;
    const verificationCode = req.query.verificationCode;

    const data = await verifyEmailService(email, verificationCode);
    //todo: login here
    if (data.success) {
        res.redirect(`${frontEndBaseUrl}/auth/verifyEmail`);
    } else {
        throw new BadRequest('Invalid verification code or email');
    }

    // SuccessResponse.ok(res, { email, data });
};

export const getProfileController = async (req: Request, res: Response) => {
    const returnData: any = sanitizeUserObject(req.currentUser);

    SuccessResponse.ok(res, returnData);
};

export const googleOAuthRedirectController = async (req: Request, res: Response) => {
    const code = req.body.code;
    if (!code || typeof code !== 'string') {
        throw new AuthenticationError('Google authentication failed');
    }
    //todo:chase these into services
    // const data = await getOAuthJwtTokenService(code);
    // const decoded = decodeJwtToken(data);
    const data: any = await googleOAuthLoginService(code);

    if (data.success) {
        const sanitizedUser: any = sanitizeUserObject(data.user);
        if (!sanitizedUser.isActive) {
            //checks if user is banned
            throw new AuthenticationError('Account is disabled');
        }
        const accessToken = signAccessJwtToken(sanitizedUser);
        sanitizedUser.accessToken = accessToken;
        SuccessResponse.ok(res, sanitizedUser);

        //todo: includes token of some kind for FE & handle on frontend
    } else {
        res.redirect(`${frontEndBaseUrl}/auth/login`);
        //todo: include message of some kind for FE
    }
};
