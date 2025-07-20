import { BadRequest, Forbidden, InternalServerError, PaymentRequire } from '@/core/error';
import { IFeatureUsageInterval } from '@/models/subscription/planFeature.model';
import subscriptionService from '@/services/subscription/subscription.service';
import { featureUsageService } from '@/services/subscription/usage/featureUsage.service';
import {
    getCurrentDateInTimeZone,
    getCurrentTimestampFromRequest,
    getDateFormatted,
    getTimezoneClient,
    isExpiredDate,
} from '@/utils/date';
import { addDays, differenceInSeconds, endOfDay } from 'date-fns';
import { NextFunction, Request, Response } from 'express';

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

const TYPE_FEATURE_USAGE = {
    boolean: 'boolean',
    usage: 'usage',
    quota: 'quota',
    text: 'text',
};

const PLAN_WILL_BE_IGNORE = 'free';

class SubscriptionMiddleware {
    private readonly DEFAULT_DATE_FOR_MONTH = 30;
    private readonly DEFAULT_DATE_FOR_WEEK = 7;
    private readonly DEFAULT_DATE_FOR_YEAR = 365;

    constructor() {
        this.handleSubscription = this.handleSubscription.bind(this);
        this.isFeatureLimitExceeded = this.isFeatureLimitExceeded.bind(this);
    }

    /**
     * Middleware to check if the user has an active subscription.
     * If the subscription is expired or feature limits are exceeded, it throws a PaymentRequire error.
     */
    public async handleSubscription(req: Request, res: Response, next: NextFunction) {
        const userId = req.currentUser?.userId;
        const timezone = getTimezoneClient(req);

        //Convert to UTC standard for compare
        const nowServerUTC = new Date();
        const currentDateFromClient = getCurrentTimestampFromRequest(req);
        const clientDateUTC = new Date(currentDateFromClient);

        // Ensure that the client's timestamp and server's timestamp are not more than 1 minute
        const maxAllowedDifference = 60 * 1000;
        const timeDifference = Math.abs(nowServerUTC.getTime() - clientDateUTC.getTime());

        if (timeDifference > maxAllowedDifference) {
            throw new Forbidden(
                `Client time is too far from server time. Difference: ${Math.round(timeDifference / 1000)}s. Please check your device clock.`
            );
        }

        const nowInClientTimezone = getCurrentDateInTimeZone(timezone);
        const today = getDateFormatted(nowInClientTimezone);

        const featureId = req.body?.featureId;

        if (!featureId) {
            throw new BadRequest('Feature ID is required for subscription check');
        }

        const userPlan = await subscriptionService.getUserSubscriptionWithPlan({ userId, timezone });

        // Check if the user has a valid subscription without free plan
        if (userPlan.plan.planType !== PLAN_WILL_BE_IGNORE) {
            const currentPeriodEnd = userPlan.subscription.currentPeriodEnd;
            const isExpired = isExpiredDate(currentPeriodEnd, today, timezone);

            const isSubscriptionExpired = isExpired || userPlan.subscription.status === 'expired';

            if (isSubscriptionExpired) {
                throw new PaymentRequire('Your subscription has expired. Please renew to continue using the service.');
            }
        }

        const planId = userPlan?.plan?.planId;
        const subscriptionId = userPlan?.subscription?.subscriptionId;

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
        subscriptionId,
    }: IFeatureRequest): Promise<boolean> {
        const planFeature = await subscriptionService.getFeatureAbilityOfPlan({
            planId,
            featureId,
        });

        const { featureType, numericValue, isEnabled, interval } = planFeature;

        if (featureType === TYPE_FEATURE_USAGE.boolean) {
            return !isEnabled;
        }

        if (featureType === TYPE_FEATURE_USAGE.usage) {
            if (!numericValue) {
                throw new InternalServerError('Numeric value is required for usage-based features');
            }

            const limitValue = parseFloat(numericValue);

            if (limitValue <= 0) {
                throw new InternalServerError('Feature limit value must be greater than zero');
            }

            const { exceeded } = await featureUsageService.checkAndIncrementUsage({
                userId,
                featureId,
                planId,
                subscriptionId,
                featureType,
                limitValue,
                interval,
                timezone,
                today,
            });

            return exceeded;
        }

        return !isEnabled;
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
