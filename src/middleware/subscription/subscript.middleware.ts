import { NextFunction, Request, Response } from 'express';

import { BadRequest, PaymentRequire } from '@/core/error';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentDateInTimeZone, getDateFormatted, getTimezoneClient } from '@/utils/date';

import { timeValidator, subscriptionValidator, featureLimitChecker } from './validators';
import { ERROR_MESSAGES } from './constants/subscription.constants';
import type { IFeatureLimitContext, ISubscriptionContext } from './types/subscription.types';

/**
 * SubscriptionMiddleware - Orchestrator Class
 *
 */
class SubscriptionMiddleware {
    constructor() {
        this.handleSubscription = this.handleSubscription.bind(this);
    }

    /**
     * Middleware to validate user subscription and feature access
     * Orchestrates: time validation → subscription validation → feature limit check
     */
    public async handleSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
        const context = this.extractRequestContext(req);
        const featureId = this.extractAndValidateFeatureId(req);

        // Validate client-server time synchronization
        timeValidator.validateClientServerTime(req);

        // Validate subscription and handle expiration (downgrade/renewal)
        const { plan, subscription } = await subscriptionValidator.getValidatedUserPlan(context);

        // Check feature usage limits
        const featureLimitContext = this.buildFeatureLimitContext(context, {
            featureId,
            planId: plan!.planId, // sure plan will be visible
            subscriptionId: subscription?.subscriptionId,
        });

        const isFeatureExceeded = await featureLimitChecker.isLimitExceeded(featureLimitContext);

        if (isFeatureExceeded) {
            throw new PaymentRequire(ERROR_MESSAGES.FEATURE_LIMIT_EXCEEDED);
        }

        next();
    }

    /**
     * Extracts subscription context from request
     */
    private extractRequestContext(req: Request): ISubscriptionContext {
        const userId = getUserIdFromRequest(req);
        const timezone = getTimezoneClient(req);
        const nowInClientTimezone = getCurrentDateInTimeZone(timezone);
        const today = getDateFormatted(nowInClientTimezone);

        return { userId, timezone, today };
    }

    /**
     * Extracts and validates feature ID from request body
     */
    private extractAndValidateFeatureId(req: Request): number {
        const featureId = req.body?.featureId;

        if (!featureId) {
            throw new BadRequest(ERROR_MESSAGES.FEATURE_REQUIRED);
        }

        return featureId;
    }

    /**
     * Builds the feature limit context by combining subscription context with feature details
     */
    private buildFeatureLimitContext(
        context: ISubscriptionContext,
        featureDetails: { featureId: number; planId: number; subscriptionId?: number }
    ): IFeatureLimitContext {
        return {
            ...context,
            ...featureDetails,
        };
    }
}

const subscriptionMiddleware = new SubscriptionMiddleware();

export default subscriptionMiddleware;
