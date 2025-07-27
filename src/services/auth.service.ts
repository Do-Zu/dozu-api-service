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
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';
import { decodeJwtToken } from '@/utils/auth/jwt.utils';

// type for getLoginData response
export interface UserLoginDataResponse extends SelectUser {
    roles: string[];
    permissions?: string[]; // optional, implement in the future
}  

type LoginResult = { success: true; user: UserLoginDataResponse } | { success: false; reason: string }; //todo:reformat as template type for every services

const getLoginData = async (userId: number) : Promise<UserLoginDataResponse> => {
    const updatedUser = await updateLastLoginAt(userId);
    const rolesSystem = await getRoles(); //get all roles in system from db
    const userRoleEntries = await getUserRoles(userId); //get all roles of user
    const userRoles = [];
    for (let roleEntry of userRoleEntries) {
        const role = rolesSystem.find(role => role.roleId === roleEntry.roleId);
        if(role) userRoles.push(role.name); // to not add undefined to the array
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
}

export const loginService = async (username: string, password: string): Promise<LoginResult> => {
    const userData = await selectOneUserByUsername(username);
    if (!userData) return { success: false, reason: 'Username does not exist' };
    if (!userData.passwordHash) return { success: false, reason: 'Password is not set up' };

    const isCorrectPassword = await verifyPassword(password, userData.passwordHash);
    if (isCorrectPassword) {
        const updatedUser = await getLoginData(userData.userId);

        return {
            success: true,
            user: updatedUser,
        };
    } else {
        return { success: false, reason: 'Username or password is not correct' };
    }
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
