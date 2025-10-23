import { db } from '@/libs/drizzleClient.lib';
import { and, eq } from 'drizzle-orm';
import { packagesTable, topicsTable } from '@/models';
import { TopicInPackageRecord, PackageRecord } from '@/types/package/package.type';

/**
 * Repository for Package data access operations
 */
class PackageRepository {
    public async createPackage(params: { userId: number; title: string; parentId?: number | null }): Promise<void> {
        const { userId, title, parentId = null } = params;
        await db().insert(packagesTable).values({ title, userId, parentId });
    }

    public async getTopicsByPackageId(packageId: number): Promise<
        Array<{
            topicId: number;
            packageId: number | null;
            name: string;
        }>
    > {
        const rows = await db()
            .select({
                topicId: topicsTable.topicId,
                packageId: topicsTable.packageId,
                name: topicsTable.name,
            })
            .from(topicsTable)
            .where(eq(topicsTable.packageId, packageId));

        return rows;
    }

    public async updatePackage(params: { packageId: number; userId: number; title: string }): Promise<{
        id: number;
        title: string;
        parentId: number | null;
    }> {
        const { packageId, title, userId } = params;

        // const cols = getTableColumns(packagesTable);
        // const { userId: _omit, createdAt: _omit, ...returnCols } = cols;

        const [result] = await db()
            .update(packagesTable)
            .set({
                title,
            })
            .where(and(eq(packagesTable.id, packageId), eq(packagesTable.userId, userId)))
            .returning({
                id: packagesTable.id,
                title: packagesTable.title,
                parentId: packagesTable.parentId,
            });

        return result;
    }

    public async updateTopicInPackage(params: {
        userId: number;
        topicId: number;
        packageId: number | null;
    }): Promise<TopicInPackageRecord | undefined> {
        const { userId, topicId, packageId } = params;
        const [result] = await db()
            .update(topicsTable)
            .set({ packageId })
            .where(and(eq(topicsTable.topicId, topicId), eq(topicsTable.userId, userId)))
            .returning({
                topicId: topicsTable.topicId,
                packageId: topicsTable.packageId,
                name: topicsTable.name,
                description: topicsTable.description,
                classId: topicsTable.classId,
            });
        return result as TopicInPackageRecord | undefined;
    }

    public async removeTopicInPackage(params: {
        topicId: number;
        packageId: number;
    }): Promise<Array<{ topicId: number; packageId: number | null }>> {
        const { topicId, packageId } = params;
        const result = await db()
            .update(topicsTable)
            .set({ packageId: null })
            .where(and(eq(topicsTable.topicId, topicId), eq(topicsTable.packageId, packageId)))
            .returning({
                topicId: topicsTable.topicId,
                packageId: topicsTable.packageId,
            });
        return result;
    }

    public async getPackagesByUser(params: {
        userId: number;
        limit: number;
        offset: number;
    }): Promise<PackageRecord[]> {
        const { userId, limit, offset } = params;
        const rows = await db()
            .select({
                id: packagesTable.id,
                title: packagesTable.title,
                parentId: packagesTable.parentId,
            })
            .from(packagesTable)
            .where(eq(packagesTable.userId, userId))
            .offset(offset)
            .limit(limit);
        return rows as PackageRecord[];
    }

    public async deletePackageById(params: { userId: number; packageId: number }): Promise<void> {
        const { userId, packageId } = params;
        await db()
            .delete(packagesTable)
            .where(and(eq(packagesTable.id, packageId), eq(packagesTable.userId, userId)));
    }
}

export const packageRepo = new PackageRepository();
