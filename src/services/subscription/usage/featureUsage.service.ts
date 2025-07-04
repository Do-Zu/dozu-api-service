import db from '@/libs/drizzleClient.lib';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { IFeatureUsageInterval } from '@/models/subscription';
import { userFeatureUsageTable } from '@/models/subscription/userFeatureUsage.model';
import { getCurrentDateInTimeZone } from '@/utils/date';
import logger from '@/utils/logger';
import {
    endOfDay,
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
} from 'date-fns';
import { and, eq } from 'drizzle-orm';

export interface IFeatureUsageService {
    userId: number;
    featureId: number;
    planId: number;
    subscriptionId?: number;
    featureType: string;
    limitValue: number;
    interval: IFeatureUsageInterval;
    timezone: string;
    today: string;
}

class FeatureUsageService {
    private readonly REDIS_PREFIX = 'feature_usage';

    async checkAndIncrementUsage({
        userId,
        featureId,
        planId,
        subscriptionId,
        limitValue,
        interval,
        timezone,
        today,
    }: IFeatureUsageService): Promise<{ exceeded: boolean; currentUsage: number }> {
        const periodKey = this.generatePeriodKey(today, timezone, interval);
        const redisKey = `${this.REDIS_PREFIX}:${userId}:${featureId}:${periodKey}`;

        // Get current usage from Redis
        let currentUsage = await redis.get(redisKey);

        if (currentUsage === null) {
            // Sync from database if not in Redis
            currentUsage = await this.syncFromDatabase(userId, featureId, interval, timezone, today);

            if (currentUsage > 0) {
                const ttl = this.calculateTTL(today, timezone, interval);
                await redis.set(redisKey, currentUsage, ttl);
            } else {
                // When DB doesn't have usage, initialize to 0
                currentUsage = 0;
                await redis.set(redisKey, currentUsage, this.calculateTTL(today, timezone, interval));
            }
        } else {
            currentUsage = parseInt(currentUsage as string);
        }

        // Check if already exceeded
        if (currentUsage >= limitValue) {
            return { exceeded: true, currentUsage };
        }

        // Increment usage
        const newUsage = await redis.incr(redisKey);

        // Set TTL if this is first increment when increment successful
        if (newUsage > 0) {
            const ttl = this.calculateTTL(today, timezone, interval);
            await redis.expire(redisKey, ttl);
        }

        // Async database update (don't await to keep response fast)
        this.updateDatabaseAsync({
            userId,
            featureId,
            planId,
            subscriptionId,
            usedValue: newUsage,
            limitValue,
            interval,
            timezone,
            today,
        });

        return { exceeded: false, currentUsage: newUsage };
    }

    private generatePeriodKey(today: string, timezone: string, interval: IFeatureUsageInterval): string {
        const date = getCurrentDateInTimeZone(timezone, today);

        switch (interval) {
            case 'daily':
                return `daily:${date.toISOString().split('T')[0]}`;
            case 'weekly': {
                const weekStart = startOfWeek(date, { weekStartsOn: 1 });
                return `weekly:${weekStart.toISOString().split('T')[0]}`;
            }
            case 'monthly':
                return `monthly:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            case 'yearly':
                return `yearly:${date.getFullYear()}`;
            case 'lifetime':
                return `lifetime:${interval}`;
            default:
                return `daily:${date.toISOString().split('T')[0]}`;
        }
    }

    private calculateTTL(today: string, timezone: string, interval: IFeatureUsageInterval): number {
        const date = getCurrentDateInTimeZone(timezone, today);

        switch (interval) {
            case 'daily':
                return Math.floor((endOfDay(date).getTime() - date.getTime()) / 1000);
            case 'weekly': {
                const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
                return Math.floor((weekEnd.getTime() - date.getTime()) / 1000);
            }
            case 'monthly': {
                const monthEnd = endOfMonth(date);
                return Math.floor((monthEnd.getTime() - date.getTime()) / 1000);
            }
            case 'yearly': {
                const yearEnd = endOfYear(date);
                return Math.floor((yearEnd.getTime() - date.getTime()) / 1000);
            }
            case 'lifetime':
                return -1; // No expiration
            default:
                return Math.floor((endOfDay(date).getTime() - date.getTime()) / 1000);
        }
    }

    /**
     * Syncs usage data from the database if not found in Redis.
     */
    private async syncFromDatabase(
        userId: number,
        featureId: number,
        interval: IFeatureUsageInterval,
        timezone: string,
        today: string
    ): Promise<number> {
        const { start, end } = this.getPeriodRange(today, timezone, interval);

        const usage = await db
            .select()
            .from(userFeatureUsageTable)
            .where(
                and(
                    eq(userFeatureUsageTable.userId, userId),
                    eq(userFeatureUsageTable.featureId, featureId),
                    eq(userFeatureUsageTable.resetPeriodStart, start),
                    eq(userFeatureUsageTable.resetPeriodEnd, end)
                )
            )
            .limit(1);

        return usage.length > 0 ? parseFloat(usage[0].usedValue) : 0;
    }

    public getPeriodRange(
        today: string | Date = new Date(),
        timezone: string = 'UTC',
        interval: IFeatureUsageInterval
    ) {
        const date = getCurrentDateInTimeZone(timezone, today);

        switch (interval) {
            case 'daily':
                return { start: startOfDay(date), end: endOfDay(date) };
            case 'weekly':
                return {
                    start: startOfWeek(date, { weekStartsOn: 1 }),
                    end: endOfWeek(date, { weekStartsOn: 1 }),
                };
            case 'monthly':
                return { start: startOfMonth(date), end: endOfMonth(date) };
            case 'yearly':
                return { start: startOfYear(date), end: endOfYear(date) };
            case 'lifetime':
                return {
                    start: new Date('1970-01-01'),
                    end: new Date('2099-12-31'), // Arbitrary far future date
                };
            default:
                return { start: startOfDay(date), end: endOfDay(date) };
        }
    }

    private async updateDatabaseAsync(params: {
        userId: number;
        featureId: number;
        planId: number;
        subscriptionId?: number;
        usedValue: number;
        limitValue: number;
        interval: IFeatureUsageInterval;
        timezone: string;
        today: string;
    }) {
        // Run in background, don't block the main request
        setImmediate(async () => {
            try {
                const { start, end } = this.getPeriodRange(params.today, params.timezone, params.interval);

                await db
                    .insert(userFeatureUsageTable)
                    .values({
                        userId: params.userId,
                        featureId: params.featureId,
                        subscriptionId: params.subscriptionId,
                        usedValue: params.usedValue.toString(),
                        limitValue: params.limitValue.toString(),
                        isUnlimited: false,
                        resetPeriodStart: start,
                        resetPeriodEnd: end,
                    })
                    .onConflictDoUpdate({
                        target: [
                            userFeatureUsageTable.userId,
                            userFeatureUsageTable.featureId,
                            userFeatureUsageTable.resetPeriodStart,
                        ],
                        set: {
                            usedValue: params.usedValue.toString(),
                            updatedAt: new Date(),
                        },
                    });
            } catch (error) {
                logger.error('Failed to update feature usage in database:', error);
            }
        });
    }
}

export const featureUsageService = new FeatureUsageService();
