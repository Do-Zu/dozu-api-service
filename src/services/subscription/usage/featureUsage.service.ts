import db from '@/libs/drizzleClient.lib';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { IFeatureUsageInterval } from '@/models/subscription';
import { userFeatureUsageTable } from '@/models/subscription/userFeatureUsage.model';
import { getCurrentDateInTimeZone, getDateFormatted } from '@/utils/date';
import logger from '@/utils/logger';
import {
    differenceInSeconds,
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
        const redisKey = `${this.REDIS_PREFIX}:${userId}:${planId}:${featureId}:${periodKey}`;

        // Get current usage from Redis
        let currentUsage = await redis.get(redisKey);

        if (currentUsage === null) {
            // Get usage from database if missing in cache
            currentUsage = await this.syncFromDatabase(userId, featureId, interval, timezone, today);

            const usage = currentUsage > 0 ? currentUsage : 0;
            await redis.set(redisKey, usage);
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

    public async incrementUsage({
        userId,
        featureId,
        planId,
        subscriptionId,
        limitValue,
        interval,
        timezone,
        today,
    }: IFeatureUsageService): Promise<void> {
        const periodKey = this.generatePeriodKey(today, timezone, interval);
        const redisKey = `${this.REDIS_PREFIX}:${userId}:${featureId}:${periodKey}`;
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
    }

    private generatePeriodKey(today: string, timezone: string, interval: IFeatureUsageInterval): string {
        const date = getCurrentDateInTimeZone(timezone);

        switch (interval) {
            case 'daily':
                return `daily:${getDateFormatted(date)}`;
            case 'weekly': {
                const weekStart = startOfWeek(date, { weekStartsOn: 1 });
                return `weekly:${getDateFormatted(weekStart)}`;
            }
            case 'monthly':
                return `monthly:${(getDateFormatted(date), 'yyyy-MM')}`;
            case 'yearly':
                return `yearly:${getDateFormatted(date, 'yyyy')}`;
            case 'lifetime':
                return `lifetime:${interval}`;
            default:
                return `daily:${getDateFormatted(date, 'yyyy-MM-dd')}`;
        }
    }

    private calculateTTL(today: string, timezone: string, interval: IFeatureUsageInterval): number {
        const date = getCurrentDateInTimeZone(timezone);

        switch (interval) {
            case 'daily':
                // Number of seconds remaining until the end of the day
                return differenceInSeconds(endOfDay(date), date);
            case 'weekly': {
                // The number of seconds until the end of Sunday
                const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
                return differenceInSeconds(weekEnd, date);
            }
            case 'monthly': {
                // The number of seconds until the end of the month
                const monthEnd = endOfMonth(date);
                return differenceInSeconds(monthEnd, date);
            }
            case 'yearly': {
                // The number of seconds until the end of the year
                const yearEnd = endOfYear(date);
                return differenceInSeconds(yearEnd, date);
            }
            case 'lifetime':
                return -1; // No expiration
            default:
                return differenceInSeconds(endOfDay(date), date);
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
        const { start, end } = this.getPeriodRange({
            date: today,
            timezone,
            interval,
        });

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

    public getPeriodRange({
        date,
        interval,
    }: {
        date: string | Date;
        timezone: string;
        interval: IFeatureUsageInterval;
    }) {
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
                const { start, end } = this.getPeriodRange({
                    date: params.today,
                    timezone: params.timezone,
                    interval: params.interval,
                });

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
