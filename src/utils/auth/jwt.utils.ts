import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import jwt from 'jsonwebtoken';

const jwtSecretKey = process.env.JWT_SECRET; //todo:check types better

const expiresIn = 86400; //Seconds until expiration - 86400= 1 day
const refreshExpiresIn = 604800; //7 days

type GoogleIdTokenPayload = {
  sub: string;
  email: string;
  picture?: string;
  name?: string;
  // Add any other fields you expect
};
//todo:consider relocating if reused

export const signAccessJwtToken = (user: SanitizedUser): string => {
  if (!jwtSecretKey) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  const token = jwt.sign(
    { userId: user.userId, roles: user.roles, email: user.email },
    jwtSecretKey,
    {
      algorithm: 'HS256',
      allowInsecureKeySizes: true,
      expiresIn: expiresIn,
    }
  );
  return token;
};

export const signRefreshJwtToken = (user: SanitizedUser): string => {
  if (!jwtSecretKey) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  const token = jwt.sign({ user }, jwtSecretKey, {
    algorithm: 'HS256',
    allowInsecureKeySizes: true,
    expiresIn: refreshExpiresIn,
  });
  return token;
};

export const verifyJwtToken = (token: string) => {
  if (!jwtSecretKey) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  const decoded: any = jwt.verify(token, jwtSecretKey);
  //todo: consider type checking and error handling
  return decoded;
};

export const decodeJwtToken = (token: string): GoogleIdTokenPayload => {
  const decoded = jwt.decode(token);
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string'
  ) {
    console.log('google token:', token);
    throw new Error('Invalid token payload');
  }
  return decoded as GoogleIdTokenPayload;
};
