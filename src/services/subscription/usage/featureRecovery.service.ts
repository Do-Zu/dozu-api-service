import db from '@/libs/drizzleClient.lib';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { userFeatureUsageTable } from '@/models/subscription/userFeatureUsage.model';
import { getCurrentDateInTimeZone } from '@/utils/date';
import logger from '@/utils/logger';
import { and, eq, gte, lte } from 'drizzle-orm';

class FeatureRecoveryService {
    // Recover Redis data from database after Redis restart
    async recoverUserFeatureUsage(userId: number, featureId: number, timezone: string, today: string) {
        try {
            const currentDate = getCurrentDateInTimeZone(timezone, today);

            // Get all active usage records for the user and feature
            const usageRecords = await db
                .select()
                .from(userFeatureUsageTable)
                .where(
                    and(
                        eq(userFeatureUsageTable.userId, userId),
                        eq(userFeatureUsageTable.featureId, featureId),
                        lte(userFeatureUsageTable.resetPeriodStart, currentDate),
                        gte(userFeatureUsageTable.resetPeriodEnd, currentDate)
                    )
                );

            // Restore to Redis
            for (const record of usageRecords) {
                const periodKey = this.generatePeriodKeyFromRecord(record);
                const redisKey = `feature_usage:${userId}:${featureId}:${periodKey}`;

                const ttl = Math.floor((record.resetPeriodEnd.getTime() - Date.now()) / 1000);

                if (ttl > 0) {
                    await redis.set(redisKey, record.usedValue, ttl);
                }
            }
        } catch (error) {
            logger.error('Failed to recover feature usage:', error);
        }
    }

    private generatePeriodKeyFromRecord(record: any): string {
        const start = new Date(record?.resetPeriodStart);
        const end = new Date(record?.resetPeriodEnd);

        // Determine interval based on period length
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
            return `daily:${start.toISOString().split('T')[0]}`;
        } else if (diffDays <= 7) {
            return `weekly:${start.toISOString().split('T')[0]}`;
        } else if (diffDays <= 31) {
            return `monthly:${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        } else if (diffDays <= 366) {
            return `yearly:${start.getFullYear()}`;
        } else {
            return `lifetime:lifetime`;
        }
    }
}

export const featureRecoveryService = new FeatureRecoveryService();
