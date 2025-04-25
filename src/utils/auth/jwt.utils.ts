import { SelectUser } from '@/models';
import jwt from 'jsonwebtoken';

const jwtSecretKey = process.env.JWT_SECRET || 'abc'; //todo:check types better
const expiresIn = 86400; //Seconds until expiration - 86400= 1 day

export const signAccessJwtToken = (user: SelectUser): string => {
  console.log(jwtSecretKey);
  const token = jwt.sign({ user }, jwtSecretKey, {
    algorithm: 'HS256',
    allowInsecureKeySizes: true,
    expiresIn: expiresIn,
  });
  return token;
};
