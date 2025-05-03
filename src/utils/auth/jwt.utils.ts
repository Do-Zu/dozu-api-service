import { SelectUser } from '@/models';
import jwt from 'jsonwebtoken';

const jwtSecretKey = process.env.JWT_SECRET || 'dev-secret'; //todo:check types better

const expiresIn = 86400; //Seconds until expiration - 86400= 1 day

type GoogleIdTokenPayload = {
  sub: string;
  email: string;
  picture?: string;
  name?: string;
  // Add any other fields you expect
};
//todo:consider relocating if reused

export const signAccessJwtToken = (user: SelectUser): string => {
  console.log(jwtSecretKey);
  const token = jwt.sign({ user }, jwtSecretKey, {
    algorithm: 'HS256',
    allowInsecureKeySizes: true,
    expiresIn: expiresIn,
  });
  return token;
};

export const verifyJwtToken = (token: string) => {
  const decoded: any = jwt.verify(token, jwtSecretKey);
  //todo: consider type checking and error handling
  return decoded;
};

export const decodeJwtToken = (token: string):GoogleIdTokenPayload => {
  const decoded = jwt.decode(token);
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string'
  ) {
    throw new Error('Invalid token payload');
    //todo:check if error thrown correctly
  }
  return decoded as GoogleIdTokenPayload;
};
