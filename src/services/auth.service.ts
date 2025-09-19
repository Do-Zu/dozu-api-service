import { InternalServerError } from '@/core/error';
import { getOAuthToken } from '@/libs/googleOAuth2Client';
import { sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { InsertAuthAccount } from '@/models';
import { InsertUser, SelectUser } from '@/models/user.model';
import {
    addRole,
    deleteVerificationCodeByEmailVerificationId,
    findByProviderId,
    getRoles,
    getTeacherRoleId,
    getUserRoleId,
    getUserRoles,
    insertAuthAccountObject,
    insertUser,
    insertUserObject,
    insertVerificationCode,
    queryVerificationCode,
    selectOneUserByUsername,
    updateLastLoginAt,
    updateUserIsVerified,
} from '@/repositories/auth.repo';
import { DecodedTokenPayload } from '@/types/auth/jwtPayload.type';
import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import { sanitizeUserObject } from '@/utils/auth/authHelpers.utils';
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';
import { decodeJwtToken, signAccessJwtToken, signRefreshJwtToken } from '@/utils/auth/jwt.utils';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

// type for getLoginData response
export interface UserLoginDataResponse extends SelectUser {
    roles: string[];
    permissions?: string[]; // optional, implement in the future
}

type LoginResult2 =
    | { success: true; user: SanitizedUser; accessToken: string; refreshToken: string }
    | { success: false; reason: string }; //todo:reformat as template type for every services

type LoginResult = { success: true; user: UserLoginDataResponse } | { success: false; reason: string }; //todo:reformat as template type for every services

type RefreshTokenResult =
    | { success: true; user: SanitizedUser; accessToken: string }
    | { success: false; reason: string };

export const loginService = async ({
    username,
    password,
}: {
    username: string;
    password: string;
}): Promise<LoginResult2> => {
    const userData = await selectOneUserByUsername(username);
    if (!userData) return { success: false, reason: 'Username does not exist' };
    if (!userData.passwordHash) return { success: false, reason: 'Password is not set up' };

    const isCorrectPassword = await verifyPassword(password, userData.passwordHash);
    if (!userData.isActive) {
        //checks if user is banned
        return { success: false, reason: 'Account is inactive' };
    } else if (isCorrectPassword) {
        const updatedUser = await getLoginData(userData.userId);
        const sanitizedUser = sanitizeUserObject(updatedUser);

        const accessToken = signAccessJwtToken(sanitizedUser);
        const refreshToken = signRefreshJwtToken(sanitizedUser);

        return {
            success: true,
            user: sanitizedUser,
            accessToken,
            refreshToken,
        };
    } else {
        return { success: false, reason: 'Username or password is not correct' };
    }
};

export const refreshTokenService = async ({ refreshToken }: { refreshToken: string }): Promise<RefreshTokenResult> => {
    if (!SECRET) {
        throw new InternalServerError('JWT_SECRET is not defined in environment variables');
    }
    let decoded: DecodedTokenPayload;
    try {
        decoded = jwt.verify(refreshToken, SECRET) as DecodedTokenPayload;
        //.verify Validates expiration by default
    } catch (error) {
        console.log(error);
        return { success: false, reason: 'refresh token does not exist or is invalid' };
    }

    //fetch updated user information
    if (!decoded.user) {
        return { success: false, reason: 'Password is not set up' };
    }
    const userId = decoded.user.userId;
    const userData = await getLoginData(userId);
    if (!userData) return { success: false, reason: 'User does not exist' };
    if (!userData.passwordHash) return { success: false, reason: 'Password is not set up' };

    const sanitizedUser = sanitizeUserObject(userData);

    const accessToken = signAccessJwtToken(sanitizedUser);

    return { success: true, user: sanitizedUser, accessToken: accessToken };
};

const getLoginData = async (userId: number): Promise<UserLoginDataResponse> => {
    const updatedUser = await updateLastLoginAt(userId);
    const rolesSystem = await getRoles(); //get all roles in system from db
    const userRoleEntries = await getUserRoles(userId); //get all roles of user
    const userRoles = [];
    for (let roleEntry of userRoleEntries) {
        const role = rolesSystem.find(role => role.roleId === roleEntry.roleId);
        if (role) userRoles.push(role.name); // to not add undefined to the array
    }
    return { ...updatedUser, roles: userRoles };
};

const addRoleUserForAccount = async (userId: number) => {
    //add the role 'user' for account with userId, create user record if not exist
    const userRoleId = await getUserRoleId();
    await addRole(userRoleId, userId);
};

export const addRoleTeacherForAccount = async (userId: number) => {
    const teacherRoleId = await getTeacherRoleId();
    await addRole(teacherRoleId, userId);
};

//todo:format response with types
//todo:consider error instead of formatted response
export const registerUserService = async (username: string, password: string, email: string) => {
    const passwordHash = await hashPassword(password);

    const newUserData = await insertUser(username, passwordHash, email);
    const verificationCodeData = await insertVerificationCode(newUserData);
    await sendVerificationLinkEmail(newUserData.email, verificationCodeData.verificationCode as string);
    // const data = hashedPassword;
    const returnUserData = await getLoginData(newUserData.userId);
    await addRoleUserForAccount(newUserData.userId);
    return { success: true, user: returnUserData };
};

export const verifyEmailService = async (email: any, verificationCode: any) => {
    const verificationCodeData = await queryVerificationCode(email, verificationCode);
    //todo:check expired code
    if (!verificationCodeData) return { success: false, reason: 'Email or verification code is wrong' };
    await updateUserIsVerified(verificationCodeData.userId);
    await deleteVerificationCodeByEmailVerificationId(verificationCodeData.emailVerificationCodeId);

    //todo:WIP
    return { success: true };
};

export const getOAuthJwtTokenService = async (code: string) => {
    const result = await getOAuthToken(code);
    return result;
};

export const googleOAuthLoginService = async (code: string): Promise<LoginResult> => {
    const googleTokens = await getOAuthJwtTokenService(code);
    const decoded = decodeJwtToken(googleTokens); // contains sub, email, etc.
    //add type of decoded

    if (!decoded || typeof decoded.sub !== 'string') {
        return { success: false, reason: 'Decoding jwt failed' };
        //todo: checks better
    }
    const existingAuthAccount = await findByProviderId('google', decoded.sub);
    let user;
    if (existingAuthAccount) {
        //checks if user exist
        user = await getLoginData(existingAuthAccount.userId);
        //continues with login
        return { success: true, user };
    } else {
        //handles registering new user
        //todo: check if already registered regularly with email and password
        const username = `user_${crypto.randomUUID().slice(0, 8)}`; //generate unique username
        const newUser: InsertUser = {
            username: username,
            email: decoded.email,
            avatarUrl: decoded.picture,
            isVerified: true,
        };
        const newUserData = await insertUserObject(newUser);

        //add the link auth account
        const newAuthAccount: InsertAuthAccount = {
            userId: newUserData.userId,
            provider: 'google',
            providerId: decoded.sub,
        };
        await insertAuthAccountObject(newAuthAccount);
        await addRoleUserForAccount(newUserData.userId);
        const returnUserData = await getLoginData(newUserData.userId);

        return { success: true, user: returnUserData };
    }
};

//todo:Checks if username is unique in database(has no duplicate),
//returns true if unique
export const isUniqueUsernameService = async (username: string): Promise<boolean> => {
    const userData = await selectOneUserByUsername(username);
    if (!userData) {
        return true;
    } else {
        return false;
    }
};
