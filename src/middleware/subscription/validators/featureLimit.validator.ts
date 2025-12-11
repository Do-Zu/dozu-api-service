import subscriptionService from '@/services/subscription/subscription.service';
import { featureUsageService } from '@/services/subscription/usage/featureUsage.service';
import { InternalServerError } from '@/core/error';
import { FEATURE_USAGE_TYPE, ERROR_MESSAGES } from '../constants/subscription.constants';
import type { IFeatureLimitContext, IPlanFeature } from '../types/subscription.types';

/**
 * FeatureLimitChecker - Single Responsibility Principle
 * Responsible only for checking and validating feature usage limits
 */
export class FeatureLimitChecker {
    /**
     * Checks if the user has exceeded their feature limit
     * @param context - Feature limit context with user, plan, and feature details
     * @returns true if limit is exceeded, false otherwise
     */
    public async isLimitExceeded(context: IFeatureLimitContext): Promise<boolean> {
        const planFeature = await this.fetchPlanFeature(context.planId, context.featureId);

        return this.evaluateFeatureLimit(planFeature, context);
    }

    private async fetchPlanFeature(planId: number, featureId: number): Promise<IPlanFeature> {
        return subscriptionService.getFeatureAbilityOfPlan({ planId, featureId });
    }

    private async evaluateFeatureLimit(planFeature: IPlanFeature, context: IFeatureLimitContext): Promise<boolean> {
        const { featureType, isEnabled } = planFeature;

        switch (featureType) {
            case FEATURE_USAGE_TYPE.BOOLEAN:
                return this.checkBooleanFeature(isEnabled);

            case FEATURE_USAGE_TYPE.USAGE:
                return this.checkUsageFeature(planFeature, context);

            default:
                return this.checkBooleanFeature(isEnabled);
        }
    }

    private checkBooleanFeature(isEnabled: boolean): boolean {
        return !isEnabled;
    }

    private async checkUsageFeature(planFeature: IPlanFeature, context: IFeatureLimitContext): Promise<boolean> {
        const limitValue = this.parseAndValidateLimitValue(planFeature.numericValue);

        const { exceeded } = await featureUsageService.checkAndIncrementUsage({
            userId: context.userId,
            featureId: context.featureId,
            planId: context.planId,
            subscriptionId: context.subscriptionId,
            featureType: planFeature.featureType,
            limitValue,
            interval: planFeature.interval,
            timezone: context.timezone,
            today: context.today,
        });

        return exceeded;
    }

    private parseAndValidateLimitValue(numericValue: string | null): number {
        if (!numericValue) {
            throw new InternalServerError(ERROR_MESSAGES.NUMERIC_VALUE_REQUIRED);
        }

        const limitValue = parseFloat(numericValue);

        if (limitValue <= 0) {
            throw new InternalServerError(ERROR_MESSAGES.INVALID_LIMIT_VALUE);
        }

        return limitValue;
    }
}

export const featureLimitChecker = new FeatureLimitChecker();
