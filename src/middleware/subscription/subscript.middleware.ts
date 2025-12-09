import { NextFunction, Request, Response } from 'express';

import subscriptionService from '@/services/subscription/subscription.service';
import planService from '@/services/subscription/plan.service';
import { featureUsageService } from '@/services/subscription/usage/featureUsage.service';
import { BadRequest, Forbidden, InternalServerError, NotFoundError, PaymentRequire } from '@/core/error';
import { SubscriptionStatusEnum } from '@/dtos/subscription/subscription.dto';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { compareIgnoreCapitalization, isEmpty, safeDestructure } from '@/utils/common';
import {
    getCurrentDateInTimeZone,
    getCurrentTimestampFromRequest,
    getDateFormatted,
    getSystemDate,
    getTimezoneClient,
    TIME_ZONE_SYSTEM,
} from '@/utils/date';
import { isBefore } from 'date-fns';

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
    private readonly DEFAULT_MAX_DIFF_CLIENT_SERVER_BOUNDARY = 60 * 1000; // 1 minute

    constructor() {
        this.handleSubscription = this.handleSubscription.bind(this);
        this.isFeatureLimitExceeded = this.isFeatureLimitExceeded.bind(this);
    }

    /**
     * Middleware to check if the user has an active subscription.
     * If the subscription is expired or feature limits are exceeded, it throws a PaymentRequire error.
     */
    public async handleSubscription(req: Request, res: Response, next: NextFunction) {
        const userId = getUserIdFromRequest(req);
        const timezone = getTimezoneClient(req);

        //Convert to UTC standard for compare
        const nowServerUTC = getCurrentDateInTimeZone(TIME_ZONE_SYSTEM.UTC, getSystemDate());
        const currentDateFromClient = getCurrentTimestampFromRequest(req);
        const clientDateUTC = getCurrentDateInTimeZone(TIME_ZONE_SYSTEM.UTC, currentDateFromClient);

        // Ensure that the client's timestamp and server's timestamp are not more than 1 minute
        const maxAllowedDifference = this.DEFAULT_MAX_DIFF_CLIENT_SERVER_BOUNDARY;
        const timeDifference = Math.abs(nowServerUTC.getTime() - clientDateUTC.getTime());

        if (timeDifference > maxAllowedDifference) {
            throw new Forbidden(`client time is too far from server time. Please check your device clock.`);
        }

        const featureId = req.body?.featureId;

        if (!featureId) {
            throw new BadRequest('feature is required for subscription check');
        }

        let userPlan = await subscriptionService.getUserSubscriptionWithPlan({ userId, timezone });

        const { plan, subscription } = safeDestructure(userPlan);

        if (isEmpty(plan) || isEmpty(subscription)) {
            throw new NotFoundError('user plan not found');
        }

        const nowInClientTimezone = getCurrentDateInTimeZone(timezone);
        const today = getDateFormatted(nowInClientTimezone);
        const currentPeriodEnd = getDateFormatted(subscription?.currentPeriodEnd);
        const isExpired = this.isExpiredDate(currentPeriodEnd, today, timezone);

        const isSubscriptionExpired =
            isExpired || compareIgnoreCapitalization(subscription?.status, SubscriptionStatusEnum.EXPIRED);

        if (isSubscriptionExpired) {
            if (!compareIgnoreCapitalization(plan?.planType, PLAN_WILL_BE_IGNORE)) {
                userPlan = await this.handleDowngradePlan({ userId, timezone });
            } else {
                const reNewSubscription = await subscriptionService.processRenewal({
                    subscriptionId: subscription.subscriptionId,
                    timezone,
                });

                if (!reNewSubscription) {
                    throw new InternalServerError('re-new subscription fail!');
                }

                const { newPeriodEnd, newPeriodStart } = reNewSubscription;

                userPlan.subscription = {
                    ...subscription,
                    currentPeriodStart: getCurrentDateInTimeZone(timezone, newPeriodStart),
                    currentPeriodEnd: getCurrentDateInTimeZone(timezone, newPeriodEnd),
                };
            }
        }

        // Check if the user has a valid subscription without free plan
        const planId = plan?.planId;
        const subscriptionId = subscription?.subscriptionId;

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

    /**
     *  Check limitation  current feature of plan
     * @param object
     * @returns boolean
     */
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

    /**
     * Down subscription to free when expire
     * @param userId
     * @param timezone
     * @returns new plan
     */
    private handleDowngradePlan = async ({ userId, timezone }: { userId: number; timezone: string }) => {
        const freePlan = await planService.getFreePlan();

        const downSubscription = await subscriptionService.changeSubscription({
            newPlanId: freePlan.planId,
            userId,
            timeZone: timezone,
            status: SubscriptionStatusEnum.EXPIRED,
        });

        if (!downSubscription) {
            throw new InternalServerError('Down Subscription Fail!');
        }

        // Get new plan for user
        return await subscriptionService.getUserSubscriptionWithPlan({ userId, timezone });
    };

    /**
     * Check if a subscription's current period end date is expired compared to today's date.
     * This function compares the end date with today's date in the specified timezone.
     *  @param currentPeriodEnd - The end date of the subscription period in ISO format (e.g., "2025-05-16T10:00:00+07:00")
     *  @param today - The current date in ISO format (e.g., "2025-05-16T10:00:00+07:00")
     *  @param timezone - The timezone to use for comparison (defaults to 'UTC')
     *  @returns boolean - Returns true if the current period end date is before today's date, indicating it has expired.
     *  If the dates are equal, it returns false, indicating the subscription is still active
     */
    private isExpiredDate = (
        currentPeriodEnd: Date | string,
        today: Date | string,
        timezone: string = 'UTC'
    ): boolean => {
        const endDate = getCurrentDateInTimeZone(timezone, currentPeriodEnd);
        const todayDate = getCurrentDateInTimeZone(timezone, today);
        return isBefore(endDate, todayDate);
    };
}

const subscriptionMiddleware = new SubscriptionMiddleware();

export default subscriptionMiddleware;
