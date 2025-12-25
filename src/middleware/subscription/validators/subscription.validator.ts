import { isBefore } from 'date-fns';

import subscriptionService from '@/services/subscription/subscription.service';
import planService from '@/services/subscription/plan.service';
import { InternalServerError, NotFoundError } from '@/core/error';
import { SubscriptionStatusEnum } from '@/dtos/subscription/subscription.dto';
import { compareIgnoreCapitalization, isEmpty, safeDestructure } from '@/utils/common';
import { getCurrentDateInTimeZone, getDateFormatted } from '@/utils/date';
import { SUBSCRIPTION_CONSTANTS, ERROR_MESSAGES } from '../constants/subscription.constants';
import type { IUserPlan, ISubscriptionContext } from '../types/subscription.types';

/**
 * SubscriptionValidator - Single Responsibility Principle
 * Responsible for validating and managing subscription state (expiration, renewal, downgrade)
 */
export class SubscriptionValidator {
    /**
     * Fetches and validates user's subscription, handling expiration if necessary
     * @param context - Subscription context containing userId and timezone
     * @returns Validated and potentially updated user plan
     */
    public async getValidatedUserPlan(context: ISubscriptionContext): Promise<IUserPlan> {
        const { userId, timezone, today } = context;

        let userPlan = await this.fetchUserPlan(userId, timezone);

        const { plan, subscription } = safeDestructure(userPlan);

        this.validatePlanExists(plan, subscription);

        const isExpired = this.checkSubscriptionExpiration(subscription, today, timezone);

        if (isExpired) {
            userPlan = await this.handleExpiredSubscription(userPlan, { userId, timezone });
        }

        return safeDestructure(userPlan);
    }

    /**
     *
     * @param userId
     * @param timezone
     * @returns
     */
    private async fetchUserPlan(userId: number, timezone: string): Promise<IUserPlan> {
        return subscriptionService.getUserSubscriptionWithPlan({ userId, timezone });
    }

    /**
     *
     * @param plan
     * @param subscription
     */
    private validatePlanExists(plan: unknown, subscription: unknown): void {
        if (isEmpty(plan) || isEmpty(subscription)) {
            throw new NotFoundError(ERROR_MESSAGES.USER_PLAN_NOT_FOUND);
        }
    }

    /**
     *
     * @param subscription
     * @param today
     * @param timezone
     * @returns
     */
    private checkSubscriptionExpiration(
        subscription: IUserPlan['subscription'],
        today: string,
        timezone: string
    ): boolean {
        if (!subscription) return false;

        const currentPeriodEnd = getDateFormatted(subscription.currentPeriodEnd);
        const isDateExpired = this.isExpiredDate(currentPeriodEnd, today, timezone);
        const isStatusExpired = compareIgnoreCapitalization(subscription.status, SubscriptionStatusEnum.EXPIRED);

        return isDateExpired || isStatusExpired;
    }

    /**
     * Handle subscription expired
     * @param userPlan
     * @param context
     * @returns new plan
     */
    private async handleExpiredSubscription(
        userPlan: IUserPlan,
        context: { userId: number; timezone: string }
    ): Promise<IUserPlan> {
        const { plan, subscription } = safeDestructure(userPlan);

        const isFreePlan = compareIgnoreCapitalization(plan!.planType, SUBSCRIPTION_CONSTANTS.FREE_PLAN_TYPE);

        if (isFreePlan) {
            return this.renewFreePlanSubscription(userPlan, subscription!, context.timezone);
        }

        return this.downgradeToPlan(context.userId, context.timezone);
    }

    /**
     * re-new for default plan
     * @param userPlan
     * @param subscription
     * @param timezone
     * @returns new plan
     */
    private async renewFreePlanSubscription(
        userPlan: IUserPlan,
        subscription: NonNullable<IUserPlan['subscription']>,
        timezone: string
    ): Promise<IUserPlan> {
        const renewalResult = await subscriptionService.processRenewal({
            subscriptionId: subscription.subscriptionId,
            timezone,
        });

        if (!renewalResult) {
            throw new InternalServerError(ERROR_MESSAGES.RENEWAL_FAILED);
        }

        const { newPeriodEnd, newPeriodStart } = renewalResult;

        return {
            ...userPlan,
            subscription: {
                ...subscription,
                currentPeriodStart: getCurrentDateInTimeZone(timezone, newPeriodStart),
                currentPeriodEnd: getCurrentDateInTimeZone(timezone, newPeriodEnd),
            },
        };
    }
    /**
     * DownGrade current plan
     * @param userId
     * @param timezone
     * @returns new plan
     */
    private async downgradeToPlan(userId: number, timezone: string): Promise<IUserPlan> {
        const freePlan = await planService.getFreePlan();

        const downgradeResult = await subscriptionService.changeSubscription({
            newPlanId: freePlan.planId,
            userId,
            timeZone: timezone,
            status: SubscriptionStatusEnum.EXPIRED,
        });

        if (!downgradeResult) {
            throw new InternalServerError(ERROR_MESSAGES.DOWNGRADE_FAILED);
        }

        return subscriptionService.getUserSubscriptionWithPlan({ userId, timezone });
    }

    /**
     * Checks if a subscription period has expired
     * @param currentPeriodEnd - End date of the subscription period
     * @param today - Current date string
     * @param timezone - Timezone for comparison (defaults to 'UTC')
     * @returns true if expired, false otherwise
     */
    private isExpiredDate(currentPeriodEnd: Date | string, today: Date | string, timezone: string = 'UTC'): boolean {
        const endDate = getCurrentDateInTimeZone(timezone, currentPeriodEnd);
        const todayDate = getCurrentDateInTimeZone(timezone, today);
        return isBefore(endDate, todayDate);
    }
}

export const subscriptionValidator = new SubscriptionValidator();
