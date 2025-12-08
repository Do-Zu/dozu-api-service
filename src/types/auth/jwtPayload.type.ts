import { JwtPayload } from 'jsonwebtoken';
import { SanitizedUser } from './sanitizedUser.type';

// interface UserPayload {
//     userId: number;
//     username: string;
//     email: string;
//     fullName: string | null;
//     avatarUrl: string;
//     isNewUser: boolean;
//     hasCompletedOnboarding: boolean;
//     createdAt: string;
//     lastLoginAt: string;
//     permissions: string[];
//     roles: string[];
//     isActive: boolean;
// }

export interface DecodedTokenPayload extends JwtPayload {
    user: SanitizedUser;//every request from logged in user has to have user object
}
