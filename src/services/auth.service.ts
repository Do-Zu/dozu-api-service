import { BadRequest } from '@/core/error';
import { getOAuthToken } from '@/libs/googleOAuth2Client';
import { sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { InsertUser, SelectUser } from '@/models/user.model';
import {
  deleteVerificationCodeByEmailVerificationId,
  insertUser,
  insertVerificationCode,
  queryVerificationCode,
  selectOneUserByUsername,
  updateUserIsVerified,
} from '@/repositories/auth.repo';
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';

type LoginResult = { success: true; user: SelectUser } | { success: false; reason: string };//todo:reformat as template type for every services
export const loginService = async (username: string, password: string): Promise<LoginResult> => {
  const userData = await selectOneUserByUsername(username);
  if (!userData) return { success: false, reason: 'Username does not exist' };
  const isCorrectPassword = await verifyPassword(password, userData.passwordHash);
  if (isCorrectPassword) return { success: true, user: userData };
  else return { success: false, reason: 'Username or password is not correct' };
};

//todo:format response with types
export const registerUserService = async (username: string, password: string, email: string) => {
  const passwordHash = await hashPassword(password);

  const newUserData = await insertUser(username, passwordHash, email);
  const verificationCodeData = await insertVerificationCode(newUserData);
  const info = await sendVerificationLinkEmail(
    newUserData.email,
    verificationCodeData.verificationCode as string
  );
  // const data = hashedPassword;

  return { success: true, user: newUserData };
};

export const verifyEmailService = async (email: any, verificationCode: any) => {
  const verificationCodeData = await queryVerificationCode(email, verificationCode);
  //todo:check expired code
  if (!verificationCodeData)
    return { success: false, reason: 'Email or verification code is wrong' };
  await updateUserIsVerified(verificationCodeData.userId);
  await deleteVerificationCodeByEmailVerificationId(verificationCodeData.emailVerificationCodeId)


  //todo:WIP
  return { success: true };
};

export const getOAuthJwtTokenService = async (code: string) => {
  const result = await getOAuthToken(code);
  return result;
};

//Checks if username is unique in database(has no duplicate),
//returns true if unique
export const isUniqueUsernameService = async (username: string): Promise<boolean> => {
  const userData = await selectOneUserByUsername(username);
  if (!userData) {
    return true;
  } else {
    return false;
  }
};
