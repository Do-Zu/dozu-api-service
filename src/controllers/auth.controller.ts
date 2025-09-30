import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import {
    changePasswordService,
    googleOAuthLoginService,
    loginService,
    refreshTokenService,
    registerUserService,
    sendChangePasswordLinkService,
    verifyEmailService,
} from '@/services/auth.service';

import { AuthenticationError, BadRequest, InternalServerError } from '@/core/error';
const frontEndBaseUrl = process.env.FRONTEND_BASE_URL;

export const testingAuthPath = async (req: Request, res: Response) => {
    // const data = await handleServiceDemo(req.body);
    SuccessResponse.ok(res, { message: 'Auth running' });
};

export const loginController = async (req: Request, res: Response) => {
    if (!req.body.username || !req.body.password) {
        throw new BadRequest('Both username and password are required');
    }
    const username = req.body.username;
    const password = req.body.password;
    const data = await loginService({ username, password });
    if (!data.success) {
        throw new AuthenticationError(data.reason);
    }

    res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });

    const returnData = {
        ...data.user,
        isNewUser: false, //technically business logic, can move to service
        accessToken: data.accessToken,
    };
    SuccessResponse.ok(res, returnData);
};

export const registerUserController = async (req: Request, res: Response) => {
    if (!req.body.username || !req.body.password || !req.body.email) {
        throw new BadRequest('Username, password and email are required');
    }
    const data = await registerUserService(req.body.username, req.body.password, req.body.email);
    // const sanitizedUser = sanitizeUserObject(data.user);
    // const accessToken = signAccessJwtToken(sanitizedUser);

    if (!data.success) {
        throw new AuthenticationError(data.reason);
    }

    //sets refreshToken cookie
    res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });

    const returnData = {
        ...data.user,
        isNewUser: true, //technically business logic, can move to service
        accessToken: data.accessToken,
    };
    SuccessResponse.created(res, returnData);
};

export const logoutController = async (req: Request, res: Response) => {
    //?Consider blacklist if more security is wanted
    res.clearCookie('refreshToken');
    SuccessResponse.ok(res, {}); //todo:check if empty data is ok
};

export const refreshTokenController = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new AuthenticationError('Refresh token does not exist');
    }
    const refreshTokenServiceData = await refreshTokenService({ refreshToken: refreshToken });
    if (!refreshTokenServiceData.success) {
        throw new AuthenticationError(refreshTokenServiceData.reason);
    } else {
        const returnData = {
            user: refreshTokenServiceData.user,
            isNewUser: false,
            accessToken: refreshTokenServiceData.accessToken,
        };
        SuccessResponse.ok(res, returnData);
    }
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
    // const returnData: any = sanitizeUserObject(req.currentUser?.user);

    // todo - implement logic for getting new data here

    SuccessResponse.ok(res, req.currentUser?.user);
};

export const googleOAuthRedirectController = async (req: Request, res: Response) => {
    const code = req.body.code;
    if (!code || typeof code !== 'string') {
        throw new AuthenticationError('Google authentication failed');
    }

    // const data = await getOAuthJwtTokenService(code);
    // const decoded = decodeJwtToken(data);
    const data = await googleOAuthLoginService(code);

    if (data.success) {
        res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        const returnData = {
            user: data.user,
            isNewUser: false,
            accessToken: data.accessToken,
        };
        SuccessResponse.ok(res, returnData);
    } else {
        res.redirect(`${frontEndBaseUrl}/auth/login?reason=${data.reason}`);
        //todo: include message of some kind for FE
    }
};

export const sendChangePasswordLinkController = async (req: Request, res: Response) => {
    if (!req.body.email) {
        throw new BadRequest('Email is required');
    }
    const data = await sendChangePasswordLinkService({ email: req.body.email });

    if (data.success) {
        SuccessResponse.ok(res, { message: 'ok' });
    } else {
        // //todo: include message of some kind for FE
        throw new InternalServerError('Error starting change password process');
    }
};

export const changePasswordController = async (req: Request, res: Response) => {
    if (!req.body.email || !req.body.verificationCode || !req.body.password) {
        throw new BadRequest('Invalid or expired password reset link');
    }
    const data = await changePasswordService({
        email: req.body.email,
        verificationCode: req.body.verificationCode,
        password: req.body.password,
    });

    if (!data.success) {
        throw new BadRequest(data.reason);
    }

    res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });

    const returnData = {
        ...data.user,
        isNewUser: false, //technically business logic, can move to service
        accessToken: data.accessToken,
    };
    SuccessResponse.ok(res, returnData);
};
