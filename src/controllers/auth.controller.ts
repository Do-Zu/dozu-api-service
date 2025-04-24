import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import { loginService, registerUserService, verifyEmailService } from '@/services/auth.service';
import { sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { BadRequest } from '@/core/error';
import { signAccessJwtToken } from '@/utils/auth/jwt.utils';

export const testingAuthPath = async (req: Request, res: Response) => {
  // const data = await handleServiceDemo(req.body);
  SuccessResponse.ok(res, { message: 'Auth running' });
};

export const registerUserController = async (req: Request, res: Response) => {
  if (!req.body.username || !req.body.password || !req.body.email) {
    throw new BadRequest('Username, password and email are required');
  }
  const data = await registerUserService(req.body.username, req.body.password, req.body.email);
  SuccessResponse.created(res, data);
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
    res.cookie('accessToken', accessToken, { httpOnly: true });
    const returnData = {
      userId: data.user.userId,
      username: data.user.username,
      email: data.user.email,
      fullName: data.user.fullName,
      avatarUrl: data.user.avatarUrl,
    };
    SuccessResponse.ok(res, returnData);
  }
};
