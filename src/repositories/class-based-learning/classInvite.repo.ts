import db, { Transaction } from '@/libs/drizzleClient.lib';
import { classInvitesTable, usersTable, classesTable } from '@/models';
import { IClassInvite, IInviteResponse, IClassInviteWithDetails } from '@/types/class-based-learning/classInvite.type';
import { and, eq, sql, desc } from 'drizzle-orm';

export type ICreateInviteRepo = {
    classId: number;
    invitedBy: number;
    invitedUserId?: number;
    invitedEmail?: string;
    token: string;
    expiresAt: Date;
    useLimit?: number;
};

export type IUpdateInviteRepo = {
    status?: 'pending' | 'accepted' | 'rejected' | 'expired';
    usedCount?: number;
    updatedAt?: Date;
};

class ClassInviteRepo {
    /**
     * Create a new invite record
     */
    public async createInvite(data: ICreateInviteRepo): Promise<IClassInvite> {
        const [invite] = await db.insert(classInvitesTable).values({
            ...data,
            updatedAt: new Date(),
        }).returning();

        return invite;
    }

    /**
     * Get invite by token
     */
    public async getInviteByToken(token: string): Promise<IClassInvite | null> {
        const [invite] = await db
            .select()
            .from(classInvitesTable)
            .where(eq(classInvitesTable.token, token))
            .limit(1);

        return invite || null;
    }

    /**
     * Get invites by class ID
     */
    public async getInvitesByClassId(classId: number): Promise<IClassInviteWithDetails[]> {
        const invites = await db
            .select({
                inviteId: classInvitesTable.inviteId,
                classId: classInvitesTable.classId,
                invitedBy: classInvitesTable.invitedBy,
                invitedUserId: classInvitesTable.invitedUserId,
                invitedEmail: classInvitesTable.invitedEmail,
                token: classInvitesTable.token,
                status: classInvitesTable.status,
                expiresAt: classInvitesTable.expiresAt,
                useLimit: classInvitesTable.useLimit,
                usedCount: classInvitesTable.usedCount,
                createdAt: classInvitesTable.createdAt,
                updatedAt: classInvitesTable.updatedAt,
                className: sql<string>`COALESCE(${classesTable.name}, 'Unknown Class')`,
                teacherName: sql<string>`COALESCE(${usersTable.fullName}, 'Unknown Teacher')`,
                invitedUserName: sql<string>`invited_user.full_name`,
                invitedUserEmail: sql<string>`invited_user.email`,
            })
            .from(classInvitesTable)
            .leftJoin(classesTable, eq(classesTable.classId, classInvitesTable.classId))
            .leftJoin(usersTable, eq(usersTable.userId, classInvitesTable.invitedBy))
            .leftJoin(sql`users invited_user`, sql`invited_user.user_id = ${classInvitesTable.invitedUserId}`)
            .where(eq(classInvitesTable.classId, classId))
            .orderBy(desc(classInvitesTable.createdAt));

        return invites;
    }

    /**
     * Update invite status
     */
    public async updateInviteStatus(
        inviteId: number, 
        status: 'pending' | 'accepted' | 'rejected' | 'expired',
        tx?: Transaction
    ): Promise<void> {
        const executor = tx ?? db;
        await executor
            .update(classInvitesTable)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(eq(classInvitesTable.inviteId, inviteId));
    }

    /**
     * Increment use count for an invite
     */
    public async incrementUseCount(inviteId: number, tx?: Transaction): Promise<void> {
        const executor = tx ?? db;
        await executor
            .update(classInvitesTable)
            .set({
                usedCount: sql`${classInvitesTable.usedCount} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(classInvitesTable.inviteId, inviteId));
    }

    /**
     * Check if invite already exists for email and class
     */
    public async getInviteByEmailAndClass(email: string, classId: number): Promise<IClassInvite | null> {
        const [invite] = await db
            .select()
            .from(classInvitesTable)
            .where(
                and(
                    eq(classInvitesTable.invitedEmail, email),
                    eq(classInvitesTable.classId, classId),
                    eq(classInvitesTable.status, 'pending')
                )
            )
            .limit(1);

        return invite || null;
    }

    /**
     * Get active invite for class (not expired, not reached use limit)
     */
    public async getActiveInviteForClass(classId: number): Promise<IClassInvite | null> {
        const [invite] = await db
            .select()
            .from(classInvitesTable)
            .where(
                and(
                    eq(classInvitesTable.classId, classId),
                    eq(classInvitesTable.status, 'pending'),
                    sql`${classInvitesTable.expiresAt} > NOW()`,
                    sql`(${classInvitesTable.useLimit} IS NULL OR ${classInvitesTable.usedCount} < ${classInvitesTable.useLimit})`
                )
            )
            .limit(1);

        return invite || null;
    }

    /**
     * Delete expired invites
     */
    public async deleteExpiredInvites(): Promise<number> {
        const result = await db
            .delete(classInvitesTable)
            .where(
                and(
                    eq(classInvitesTable.status, 'pending'),
                    sql`${classInvitesTable.expiresAt} <= NOW()`
                )
            );

        return result.rowCount || 0;
    }

    /**
     * Update expired invites status
     */
    public async updateExpiredInvitesStatus(): Promise<number> {
        const result = await db
            .update(classInvitesTable)
            .set({
                status: 'expired',
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(classInvitesTable.status, 'pending'),
                    sql`${classInvitesTable.expiresAt} <= NOW()`
                )
            );

        return result.rowCount || 0;
    }

    /**
     * Regenerate invite token for class
     */
    public async regenerateInviteToken(classId: number, newToken: string, expiresAt: Date, useLimit?: number): Promise<IClassInvite> {
        // First, expire all existing invites for this class
        await db
            .update(classInvitesTable)
            .set({
                status: 'expired',
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(classInvitesTable.classId, classId),
                    eq(classInvitesTable.status, 'pending')
                )
            );

        // Create new invite
        const [invite] = await db.insert(classInvitesTable).values({
            classId,
            invitedBy: 0, // Will be set by service layer
            token: newToken,
            expiresAt,
            useLimit,
            updatedAt: new Date(),
        }).returning();

        return invite;
    }

    /**
     * Get invite statistics for a class
     */
    public async getInviteStats(classId: number): Promise<{
        totalInvites: number;
        pendingInvites: number;
        acceptedInvites: number;
        rejectedInvites: number;
        expiredInvites: number;
    }> {
        const stats = await db
            .select({
                status: classInvitesTable.status,
                count: sql<number>`COUNT(*)`,
            })
            .from(classInvitesTable)
            .where(eq(classInvitesTable.classId, classId))
            .groupBy(classInvitesTable.status);

        const result = {
            totalInvites: 0,
            pendingInvites: 0,
            acceptedInvites: 0,
            rejectedInvites: 0,
            expiredInvites: 0,
        };

        stats.forEach(stat => {
            result.totalInvites += stat.count;
            switch (stat.status) {
                case 'pending':
                    result.pendingInvites = stat.count;
                    break;
                case 'accepted':
                    result.acceptedInvites = stat.count;
                    break;
                case 'rejected':
                    result.rejectedInvites = stat.count;
                    break;
                case 'expired':
                    result.expiredInvites = stat.count;
                    break;
            }
        });

        return result;
    }
}

export default new ClassInviteRepo();
