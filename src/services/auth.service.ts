import { BadRequest } from '@/core/error';
import { sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { InsertUser, SelectUser } from '@/models/user.model';
import {
  insertUser,
  insertVerificationCode,
  queryVerificationCode,
  selectOneUserByUsername,
} from '@/repositories/auth.repo';
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';

export const registerUserService = async (username:string, password:string,email:string) => {
  const passwordHash = await hashPassword(password);

  const newUserData = await insertUser(username, passwordHash, email);
  const verificationCodeData = await insertVerificationCode(newUserData);
  const info = await sendVerificationLinkEmail(
    newUserData.email,
    verificationCodeData.verificationCode as string
  );
  // const data = hashedPassword;
  const returnData = {
    username: newUserData.username,
    email: newUserData.email,
  };

  return returnData;
};

export const verifyEmailService = async (email: any, verificationCode: any) => {
  const verificationCodeData = await queryVerificationCode(email, verificationCode);
  //todo:WIP
};

type LoginResult = { success: true; user: SelectUser } | { success: false; reason: string };
export const loginService = async (username: string, password: string): Promise<LoginResult> => {
  const userData = await selectOneUserByUsername(username);
  if (!userData) return { success: false, reason: 'Username does not exist' };
  const isCorrectPassword = await verifyPassword(password, userData.passwordHash);
  if (isCorrectPassword) return { success: true, user: userData };
  else return { success: false, reason: 'Username or password is not correct' };
};
