import db from '@/libs/drizzleClient.lib';
import { usersTable, classEnrollmentsTable } from '@/models';
import { IUserSearchResult } from '@/types/class-based-learning/classInvite.type';
import { and, eq, or, like, sql, inArray } from 'drizzle-orm';

class UserSearchService {
    /**
     * Search users by email or username
     * Excludes users already in the specified class
     */
    public async searchUsers(query: string, classId?: number): Promise<IUserSearchResult[]> {
        const searchPattern = `%${query.toLowerCase()}%`;
        
        let whereConditions = [
            eq(usersTable.isActive, true),
            or(
                like(sql`LOWER(${usersTable.email})`, searchPattern),
                like(sql`LOWER(${usersTable.username})`, searchPattern),
                like(sql`LOWER(${usersTable.fullName})`, searchPattern)
            )
        ];

        // If classId is provided, exclude users already in that class
        if (classId) {
            const subQuery = db
                .select({ studentId: classEnrollmentsTable.studentId })
                .from(classEnrollmentsTable)
                .where(eq(classEnrollmentsTable.classId, classId));

            whereConditions.push(sql`${usersTable.userId} NOT IN (${subQuery})`);
        }

        const users = await db
            .select({
                userId: usersTable.userId,
                username: usersTable.username,
                email: usersTable.email,
                fullName: usersTable.fullName,
                avatarUrl: usersTable.avatarUrl,
            })
            .from(usersTable)
            .where(and(...whereConditions))
            .limit(20); // Limit results for performance

        return users.map(user => ({
            ...user,
            isAlreadyInClass: false, // Will be set to true if user is in class
        }));
    }

    /**
     * Get users by email addresses
     * Useful for bulk invite operations
     */
    public async getUsersByEmails(emails: string[]): Promise<IUserSearchResult[]> {
        if (emails.length === 0) return [];

        const users = await db
            .select({
                userId: usersTable.userId,
                username: usersTable.username,
                email: usersTable.email,
                fullName: usersTable.fullName,
                avatarUrl: usersTable.avatarUrl,
            })
            .from(usersTable)
            .where(
                and(
                    eq(usersTable.isActive, true),
                    inArray(usersTable.email, emails)
                )
            );

        return users.map(user => ({
            ...user,
            isAlreadyInClass: false,
        }));
    }

    /**
     * Check if users are already in a specific class
     */
    public async checkUsersInClass(userIds: number[], classId: number): Promise<number[]> {
        if (userIds.length === 0) return [];

        const enrollments = await db
            .select({ studentId: classEnrollmentsTable.studentId })
            .from(classEnrollmentsTable)
            .where(
                and(
                    eq(classEnrollmentsTable.classId, classId),
                    inArray(classEnrollmentsTable.studentId, userIds)
                )
            );

        return enrollments.map(enrollment => enrollment.studentId);
    }
}

export default new UserSearchService();
