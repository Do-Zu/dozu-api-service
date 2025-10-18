import { InternalServerError } from '@/core/error';
import { getOAuthToken } from '@/libs/googleOAuth2Client';
import { sendChangePasswordLinkEmail, sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { InsertAuthAccount } from '@/models';
import { InsertChangePasswordRequest, SelectChangePasswordRequest } from '@/models/auth/changePasswordRequest.model';
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
    selectOneUserByEmail,
    selectOneUserByEmailOrUsername,
    selectOneUserByUsername,
    updateLastLoginAt,
    updateUserIsVerified,
    updateUserPassword,
} from '@/repositories/auth.repo';
import {
    deletePasswordRequestsByUserId,
    insertChangePasswordRequest,
    selectOneChangePasswordRequestByEmail,
} from '@/repositories/auth/changePasswordRequest.repo';
import { DecodedTokenPayload } from '@/types/auth/jwtPayload.type';
import { SanitizedUser } from '@/types/auth/sanitizedUser.type';
import { sanitizeUserObject } from '@/utils/auth/authHelpers.utils';
import { generateSecureCode } from '@/utils/auth/crypto.utils';
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';
import { decodeJwtToken, signAccessJwtToken, signRefreshJwtToken } from '@/utils/auth/jwt.utils';
import logger from '@/utils/logger';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

// type for getLoginData response
export interface UserLoginDataResponse extends SelectUser {
    roles: string[];
    permissions?: string[]; // optional, implement in the future
}

type LoginResult =
    | { success: true; user: SanitizedUser; accessToken: string; refreshToken: string }
    | { success: false; reason: string }; //todo:reformat as template type for every services

// type LoginResult = { success: true; user: UserLoginDataResponse } | { success: false; reason: string }; //old type

type RefreshTokenResult =
    | { success: true; user: SanitizedUser; accessToken: string }
    | { success: false; reason: string };

type StartChangePasswordResult =
    | { success: true; changePasswordRequest: SelectChangePasswordRequest }
    | { success: false; reason: string };

export const loginService = async ({
    username,
    password,
}: {
    username: string;
    password: string;
}): Promise<LoginResult> => {
    const userData = await selectOneUserByUsername(username);
    if (!userData) return { success: false, reason: 'Username does not exist' };
    if (!userData.passwordHash) return { success: false, reason: 'Password is not set up' };

    const isCorrectPassword = await verifyPassword(password, userData.passwordHash);
    if (!userData.isActive) {
        //checks if user is banned
        return { success: false, reason: 'Account is inactive' };
    } else if (!userData.isVerified) {
        return { success: false, reason: 'Account is unverified' };
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
    } catch {
        logger.warn('Refresh token is invalid');
        return { success: false, reason: 'refresh token does not exist or is invalid' };
    }

    //fetch updated user information
    if (!decoded.user) {
        return { success: false, reason: 'JWT Error' };
    }
    const userId = decoded.user.userId;
    const userData = await getLoginData(userId);

    if (!userData) return { success: false, reason: 'User does not exist' };
    if (!userData.isActive) {
        //checks if user is banned
        return { success: false, reason: 'Account is inactive' };
    }
    // if (!userData.passwordHash) return { success: false, reason: 'Password is not set up' };
    //^Cannot handle googleAuth

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

export const registerUserService = async (
    username: string,
    password: string,
    email: string,
    role: string = 'user'
): Promise<LoginResult> => {
    const passwordHash = await hashPassword(password);

    const checkExistingUser = await selectOneUserByEmailOrUsername({ username: username, email: email });
    if (checkExistingUser) {
        return { success: false, reason: 'Username or email already in use' };
    }

    const newUserData = await insertUser(username, passwordHash, email);
    const verificationCodeData = await insertVerificationCode(newUserData);
    await sendVerificationLinkEmail(newUserData.email, verificationCodeData.verificationCode as string);

    await addRoleUserForAccount(newUserData.userId);
    if (role === 'teacher') {
        await addRoleTeacherForAccount(newUserData.userId);
    }

    const returnUserData = await getLoginData(newUserData.userId);
    const sanitizedUser = sanitizeUserObject(returnUserData);

    const accessToken = signAccessJwtToken(sanitizedUser);
    const refreshToken = signRefreshJwtToken(sanitizedUser);

    return { success: true, user: sanitizedUser, accessToken: accessToken, refreshToken: refreshToken };
};

export const verifyEmailService = async (email: string, verificationCode: string): Promise<LoginResult> => {
    const verificationCodeData = await queryVerificationCode(email, verificationCode);
    if (!verificationCodeData || !verificationCodeData.expiration) {
        return { success: false, reason: 'Email or verification code is wrong' };
    }
    if (new Date() >= verificationCodeData.expiration) {
        return {
            success: false,
            reason: 'Expired request',
        };
    }
    await updateUserIsVerified(verificationCodeData.userId);
    await deleteVerificationCodeByEmailVerificationId(verificationCodeData.emailVerificationCodeId);

    const updatedUser = await getLoginData(verificationCodeData.userId);
    const sanitizedUser = sanitizeUserObject(updatedUser);

    const accessToken = signAccessJwtToken(sanitizedUser);
    const refreshToken = signRefreshJwtToken(sanitizedUser);

    return {
        success: true,
        user: sanitizedUser,
        accessToken,
        refreshToken,
    };
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

        if (!user.isActive) {
            //checks if user is banned
            return { success: false, reason: 'Account is inactive' };
        }

        const sanitizedUser = sanitizeUserObject(user);

        const accessToken = signAccessJwtToken(sanitizedUser);
        const refreshToken = signRefreshJwtToken(sanitizedUser);

        return { success: true, user: sanitizedUser, accessToken: accessToken, refreshToken: refreshToken };
    } else {
        //handles registering new user
        //check if already registered regularly with email and password
        const userIfRegistered = await selectOneUserByEmail(decoded.email);
        if (userIfRegistered) {
            return { success: false, reason: 'Email already registered with Gmail login method' };
        }

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
        const sanitizedUser = sanitizeUserObject(returnUserData);

        const accessToken = signAccessJwtToken(sanitizedUser);
        const refreshToken = signRefreshJwtToken(sanitizedUser);

        return { success: true, user: sanitizedUser, accessToken: accessToken, refreshToken: refreshToken };
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

export const sendChangePasswordLinkService = async ({
    email,
}: {
    email: string;
}): Promise<StartChangePasswordResult> => {
    const changePasswordRequestData = await selectOneChangePasswordRequestByEmail({ email });

    if (changePasswordRequestData) {
        await deletePasswordRequestsByUserId({ userId: changePasswordRequestData.userId });
    }

    const userData = await selectOneUserByEmail(email);
    if (!userData) {
        return { success: false, reason: 'User not found' };
    }

    const verificationCode = generateSecureCode();
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day later

    const newChangePasswordRequest: InsertChangePasswordRequest = {
        userId: userData.userId,
        verificationCode: verificationCode,
        expiration: expirationDate,
    };
    const newChangePasswordRequestData = await insertChangePasswordRequest({
        insertChangePasswordRequestObject: newChangePasswordRequest,
    });

    //mail the link
    await sendChangePasswordLinkEmail({ email: userData.email, verificationCode: verificationCode });

    return { success: true, changePasswordRequest: newChangePasswordRequestData };
};

export const changePasswordService = async ({
    email,
    verificationCode,
    password,
}: {
    email: string;
    verificationCode: string;
    password: string;
}): Promise<LoginResult> => {
    const changePasswordRequest = await selectOneChangePasswordRequestByEmail({ email });
    const currentTime = new Date();
    if (!changePasswordRequest || !changePasswordRequest.verificationCode || !changePasswordRequest.expiration) {
        return { success: false, reason: 'Invalid or expired change password request link' };
    }
    if (verificationCode !== changePasswordRequest.verificationCode) {
        return { success: false, reason: 'Invalid or expired change password request link' };
    }
    if (currentTime > changePasswordRequest.expiration) {
        return { success: false, reason: 'Invalid or expired change password request link' };
    }

    const userDataForCheck = await getLoginData(changePasswordRequest.userId);
    if (!userDataForCheck.isActive) {
        return { success: false, reason: 'Account is inactive' };
    }

    //change password here
    const passwordHash = await hashPassword(password);

    await updateUserPassword({ userId: changePasswordRequest.userId, hashedPassword: passwordHash });

    //login flow
    const returnUserData = await getLoginData(changePasswordRequest.userId);
    const sanitizedUser = sanitizeUserObject(returnUserData);

    const accessToken = signAccessJwtToken(sanitizedUser);
    const refreshToken = signRefreshJwtToken(sanitizedUser);

    //delete request
    await deletePasswordRequestsByUserId({ userId: changePasswordRequest.userId });

    return { success: true, user: sanitizedUser, accessToken: accessToken, refreshToken: refreshToken };
};
