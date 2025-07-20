import { SanitizedUser } from './sanitizedUser.type';

export interface JwtPayload {
  user: SanitizedUser;
  iat: number;
  exp: number;
}
