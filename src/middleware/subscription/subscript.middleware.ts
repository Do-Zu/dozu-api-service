import { NextFunction, Request, Response } from 'express';
import { BadRequest, InternalServerError, PaymentRequire } from '@/core/error';
import planService from '@/services/subscription/plan.service';
import subscriptionService from '@/services/subscription/subscription.service';
import {
    getCurrentDateInTimeZone,
    getCurrentTimestampFromRequest,
    getTimezoneClient,
    isExpiredDate,
} from '@/utils/date';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { addDays, differenceInSeconds, endOfDay } from 'date-fns';
import { IFeatureUsageInterval } from '@/models/subscription/planFeature.model';

interface ISubscriptionRequest {
    userId: number;
    today: string;
    timezone: string;
}

interface IFeatureRequest extends ISubscriptionRequest {
    featureId: number;
    planId: number;
    subscriptionId?: number;
}

interface IFeatureUsageCache {
    usedValue: number;
    limitValue: number;
    isEnabled: boolean;
    featureType: string;
    category: string;
}

class SubscriptionMiddleware {
    private readonly REDIS_FEATURE_LIMIT_EXCEEDED = 'feature_limit_exceeded_per_date';
    private readonly DEFAULT_DATE_FOR_MONTH = 30;
    private readonly DEFAULT_DATE_FOR_WEEK = 7;
    private readonly DEFAULT_DATE_FOR_DAY = 1;
    private readonly DEFAULT_DATE_FOR_YEAR = 365;

    /**
     * Middleware to check if the user has an active subscription.
     * If the subscription is expired or feature limits are exceeded, it throws a PaymentRequire error.
     */
    public async handleSubscription(req: Request, res: Response, next: NextFunction) {
        const userId = req.currentUser?.userId;
        const today = getCurrentTimestampFromRequest(req);
        const timezone = getTimezoneClient(req);
        const featureId = req.body?.featureId;

        if (!featureId) {
            throw new BadRequest('Feature ID is required for subscription check');
        }

        let userPlan = await subscriptionService.getUserSubscriptionWithPlan(userId);

        let freePlan;

        if (!userPlan) {
            freePlan = await planService.getFreePlan();

            if (!freePlan) {
                throw new InternalServerError('Free plan not found');
            }

            let priceFre = 0;

            try {
                priceFre = parseFloat(freePlan.price);
            } catch {
                priceFre = 0;
            }

            const resultCreteSubScriptionFreePlan = await subscriptionService.createSubscription({
                userId,
                planId: freePlan.planId,
                paymentData: {
                    amount: priceFre,
                },
                timeZone: timezone,
            });

            if (!resultCreteSubScriptionFreePlan) {
                throw new InternalServerError('Failed to create subscription for free plan');
            }

            userPlan = {
                plan: freePlan,
                subscription: resultCreteSubScriptionFreePlan,
            };
        }

        const currentPeriodEnd = userPlan.subscription.currentPeriodEnd;

        const isExpired = isExpiredDate(currentPeriodEnd, today, timezone);

        if (userPlan.subscription.status === 'expired' || isExpired) {
            throw new PaymentRequire('Your subscription has expired. Please renew to continue using the service.');
        }

        const planId = userPlan?.plan?.planId ?? freePlan?.planId;
        const subscriptionId = userPlan?.subscription.subscriptionId;

        const isFeatureExceeded = await this.isFeatureLimitExceeded({
            userId,
            today,
            timezone,
            featureId,
            planId,
            subscriptionId,
        });

        if (isFeatureExceeded) {
            throw new PaymentRequire('You have exceeded your feature usage limit. Please upgrade your subscription.');
        }

        next();
    }

    private async isFeatureLimitExceeded({
        userId,
        today,
        timezone,
        featureId,
        planId,
    }: IFeatureRequest): Promise<boolean> {
        const usageFeatureUsage = await subscriptionService.getFeatureAbilityOfPlan({
            planId,
            featureId,
        });

        const key = `${this.REDIS_FEATURE_LIMIT_EXCEEDED}:${userId}:${featureId}:${planId}:${timezone}`;

        const featureUsage: IFeatureUsageCache | null = await redis.get(key);

        if (!featureUsage) {
            const { featureType, category, numericValue, isEnabled, interval } = usageFeatureUsage;

            if (!featureType || !numericValue) {
                throw new InternalServerError('Feature type or numeric value is missing in the plan feature');
            }

            const creditValue = parseFloat(numericValue);

            if (creditValue <= 0) {
                throw new BadRequest('Feature limit value must be greater than zero');
            }

            const valueStoreCache = {
                usedValue: 1,
                limitValue: creditValue,
                isEnabled,
                featureType,
                category,
            };

            const timeToLiveCache = this.timeToLive(today, timezone, interval);

            await redis.set(key, valueStoreCache, timeToLiveCache);

            //TODO: update into database usage if interval is monthly, weekly, daily, yearly
            // if (interval === 'monthly' || interval === 'weekly' || interval === 'daily' || interval === 'yearly') {
            //     const resetPeriodStart = getCurrentDateInTimeZone(timezone, today);
            //     const resetPeriodEnd = addDays(resetPeriodStart, this.DEFAULT_DATE_FOR_MONTH); // Adjust based on interval

            //     await subscriptionService.createUserFeatureUsage({
            //         userId,
            //         featureId,
            //         planId,
            //         usedValue: 1,
            //         limitValue: creditValue,
            //         isUnlimited: false,
            //         isEnabled,
            //         resetPeriodStart,
            //         resetPeriodEnd,
            //     });
            // }

            if (featureType === 'boolean') {
                return !isEnabled;
            }

            if (featureType === 'usage') {
                return true;
            }

            return !isEnabled;
        }

        const { usedValue, limitValue, isEnabled } = featureUsage;

        // Check if already at limit before incrementing
        if (usedValue >= limitValue) {
            return true;
        }

        const isFeatureExceeded = usedValue >= limitValue || isEnabled === false;

        if (isFeatureExceeded) {
            return true;
        }

        const newUsedValue = usedValue + 1;

        await redis.hset(key, 'usedValue', newUsedValue.toString());

        return false;
    }

    private timeToLive(today: string, timezone?: string, interval?: IFeatureUsageInterval): number {
        const currentTimeInTimezone = getCurrentDateInTimeZone(timezone, today);
        const endOfDateTimezone = endOfDay(currentTimeInTimezone);

        if (interval === 'daily') {
            return differenceInSeconds(endOfDateTimezone, currentTimeInTimezone);
        } else if (interval === 'weekly') {
            const endOfWeek = addDays(currentTimeInTimezone, this.DEFAULT_DATE_FOR_WEEK);
            return differenceInSeconds(endOfWeek, currentTimeInTimezone);
        } else if (interval === 'monthly') {
            const endOfMonth = addDays(currentTimeInTimezone, this.DEFAULT_DATE_FOR_MONTH);
            return differenceInSeconds(endOfMonth, currentTimeInTimezone);
        } else if (interval === 'yearly') {
            const endOfYear = addDays(currentTimeInTimezone, this.DEFAULT_DATE_FOR_YEAR);
            return differenceInSeconds(endOfYear, currentTimeInTimezone);
        }

        return -1;
    }
}

const subscriptionMiddleware = new SubscriptionMiddleware();

export default subscriptionMiddleware;
