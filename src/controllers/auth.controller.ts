import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import { loginService, registerUserService, verifyEmailService } from '@/services/auth.service';
import { sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { BadRequest } from '@/core/error';
import { signAccessJwtToken } from '@/utils/auth/jwt.utils';
import { sanitizeUserObject } from '@/utils/auth/autheHelpers.utils';

export const testingAuthPath = async (req: Request, res: Response) => {
  // const data = await handleServiceDemo(req.body);
  SuccessResponse.ok(res, { message: 'Auth running' });
};

export const registerUserController = async (req: Request, res: Response) => {
  if (!req.body.username || !req.body.password || !req.body.email) {
    throw new BadRequest('Username, password and email are required');
  }
  const data = await registerUserService(req.body.username, req.body.password, req.body.email);
  const accessToken = signAccessJwtToken(data.user);


  const returnData: any = sanitizeUserObject(data);
  returnData.accessToken = accessToken;
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
    throw new BadRequest(data.reason);
  } else {
    //add cookie and more
    const accessToken = signAccessJwtToken(data.user);
    res.cookie('accessToken', accessToken, { httpOnly: true }); //todo: temp setting cookie, change to using cookie for refresh and memory for access
    const returnData: any = sanitizeUserObject(data);
    returnData.accessToken = accessToken;
    SuccessResponse.ok(res, returnData);
  }
};

export const logoutController = async (req: Request, res: Response) => {
  //todo:delete refresh token when it is implemented
  res.clearCookie('accessToken');
  SuccessResponse.ok(res, {}); //todo:checkif empty data is ok
};

export const verifyEmailController = async (req: Request, res: Response) => {
  if (!req.query.email || !req.query.verificationCode) {
    throw new BadRequest('Bad link');
  }
  const email = req.query.email;
  const verificationCode = req.query.verificationCode;

  const data = await verifyEmailService(email, verificationCode);

  SuccessResponse.ok(res, { email, verificationCode });
};

export const getProfileController = async (req: Request, res: Response) => {
  const returnData: any = sanitizeUserObject(req.currentUser);

  SuccessResponse.ok(res, returnData);
};
