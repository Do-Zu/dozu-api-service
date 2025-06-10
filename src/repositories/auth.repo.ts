import { VERIFICATION_TOKEN_DURATION_MINUTES } from '@/constants/auth.constant';
import db from '@/libs/drizzleClient.lib';
import { authAccountsTable, InsertAuthAccount, SelectAuthAccount, usersTable } from '@/models';
import {
  emailVerificationCodesTable,
  InsertEmailVerificationCode,
} from '@/models/auth/emailVerificationCode.model';
import type { InsertUser, SelectUser } from '@/models/user.model';
import { generateSecureCode } from '@/utils/auth/crypto.utils';
import { and, eq } from 'drizzle-orm';

export const insertUser = async (
  username: string,
  passwordHash: string,
  email: string
): Promise<SelectUser> => {
  const newUser: InsertUser = {
    username: username,
    passwordHash: passwordHash,
    email: email,
  };
  const [insertedUser] = await db.insert(usersTable).values(newUser).returning();
  return insertedUser;
};

export const insertUserObject = async (newUser: InsertUser): Promise<SelectUser> => {
  const [insertedUser] = await db.insert(usersTable).values(newUser).returning();
  return insertedUser;
};

export const insertVerificationCode = async (user: SelectUser) => {
  await db
    .delete(emailVerificationCodesTable)
    .where(eq(emailVerificationCodesTable.userId, user.userId));
  const verificationCode = generateSecureCode();
  const currTime = new Date();
  const expirationDate = new Date(currTime.getTime() + VERIFICATION_TOKEN_DURATION_MINUTES * 60000);
  const newVerificationCode: InsertEmailVerificationCode = {
    userId: user.userId,
    verificationCode: verificationCode,
    expiration: expirationDate,
  };
  const [insertedVerificationCode] = await db
    .insert(emailVerificationCodesTable)
    .values(newVerificationCode)
    .returning();
  return insertedVerificationCode;
};

export const queryVerificationCode = async (email: any, verificationCode: any) => {
  //also join user table to get email
  const [queryEmailData] = await db
    .select({
      userId: usersTable.userId,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  const [verificationCodeData] = await db
    .select()
    .from(emailVerificationCodesTable)
    .where(
      and(
        eq(emailVerificationCodesTable.verificationCode, verificationCode),
        eq(emailVerificationCodesTable.userId, queryEmailData.userId)
      )
    ); //todo:CHECK IF WORKING
  return verificationCodeData;
};

export const updateUserIsVerified = async (userId: number) => {
  //todo:check result of query
  await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.userId, userId));
};

export const deleteVerificationCodeByEmailVerificationId = async (
  emailVerificationCodeId: number
) => {
  await db
    .delete(emailVerificationCodesTable)
    .where(eq(emailVerificationCodesTable.emailVerificationCodeId, emailVerificationCodeId));
};

//todo:check result of query of those using [result]
export const selectOneUserById = async (userId: number) => {
  const [result] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));
  return result;
};

export const selectOneUserByUsername = async (username: string) => {
  const [result] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  return result;
};

export const selectOneUserByEmail = async (email: string) => {
  const [result] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return result;
};

export const findByProviderId = async (provider: string, providerId: string) => {
  const [result] = await db
    .select()
    .from(authAccountsTable)
    .where(
      and(eq(authAccountsTable.provider, provider), eq(authAccountsTable.providerId, providerId))
    );
  return result;
};

//auth account
export const insertAuthAccountObject = async (
  newAuthAccount: InsertAuthAccount
): Promise<SelectAuthAccount> => {
  const [insertedAuthAccount] = await db
    .insert(authAccountsTable)
    .values(newAuthAccount)
    .returning();
  return insertedAuthAccount;
};

export const updateLastLoginAt = async (userId: number) => {
  const  [result] = await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.userId, userId))
    .returning();
  return result;
};
