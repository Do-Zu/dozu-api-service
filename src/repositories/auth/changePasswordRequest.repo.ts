import {
    changePasswordRequestTable,
    InsertChangePasswordRequest,
    SelectChangePasswordRequest,
} from '@/models/auth/changePasswordRequest.model';
import db from '@/libs/drizzleClient.lib';
import { usersTable } from '@/models';
import { eq } from 'drizzle-orm';

export const insertChangePasswordRequest = async ({
    insertChangePasswordRequestObject,
}: {
    insertChangePasswordRequestObject: InsertChangePasswordRequest;
}): Promise<SelectChangePasswordRequest> => {
    const [insertedChangePasswordRequest] = await db
        .insert(changePasswordRequestTable)
        .values(insertChangePasswordRequestObject)
        .returning();
    if (!insertedChangePasswordRequest) {
        throw new Error('Failed to insert change password request');
    }
    return insertedChangePasswordRequest;
};

export const selectOneChangePasswordRequestByEmail = async ({
    email,
}: {
    email: string;
}): Promise<SelectChangePasswordRequest> => {
    const [changePasswordRequest] = await db
        .select({
            changePasswordRequestId: changePasswordRequestTable.changePasswordRequestId,
            userId: changePasswordRequestTable.userId,
            verificationCode: changePasswordRequestTable.verificationCode,
            expiration: changePasswordRequestTable.expiration,
        })
        .from(changePasswordRequestTable)
        .innerJoin(usersTable, eq(usersTable.userId, changePasswordRequestTable.userId))
        .where(eq(usersTable.email, email));
    // if (!changePasswordRequest) {
    //     throw new Error('Change password request not found');
    // }
    return changePasswordRequest;
};

export const deletePasswordRequestsByUserId = async ({
    userId,
}: {
    userId: number;
}): Promise<SelectChangePasswordRequest[]> => {
    const deletedChangePasswordRequests = await db
        .delete(changePasswordRequestTable)
        .where(eq(changePasswordRequestTable.userId, userId))
        .returning();
    return deletedChangePasswordRequests;
};


