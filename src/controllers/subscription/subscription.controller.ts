import { BadRequest, InternalServerError, NotFoundError, PaymentRequire } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import {
    checkFeatureUsageSchema,
    createSubscriptionSchema,
    recordFeatureUsageSchema,
    updateSubscriptionSchema,
    upgradeSubscriptionSchema,
} from '@/dtos/subscription/subscription.dto';
import subscriptionService from '@/services/subscription/subscription.service';
import { getCurrentDateInTimeZone, getTimezoneClient } from '@/utils/date';
import { Request, Response } from 'express';

export class SubscriptionController {
    /**
     * Get all available plans with features
     */
    public async getAllPlans(_req: Request, res: Response) {
        const plans = await subscriptionService.getAvailablePlans();

        SuccessResponse.ok(res, plans, 'Plans retrieved successfully');
    }

    /**
     * Get current user's subscription
     */
    public getCurrentSubscription = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;
        const timezone = getTimezoneClient(req);

        const subscription = await subscriptionService.getUserSubscriptionWithPlan({ userId, timezone });

        SuccessResponse.ok(res, subscription, 'Subscription retrieved successfully');
    };

    public getAllFeaturesOfPlan = async (req: Request, res: Response) => {
        const { planId } = req.body;

        if (!planId) {
            throw new BadRequest('Plan ID is required');
        }

        const features = await subscriptionService.getAllFeaturesOfPlan({ planId });

        if (!features || features.length === 0) {
            throw new NotFoundError('No features found for this plan');
        }

        SuccessResponse.ok(res, features, 'Plan features retrieved successfully');
    };

    /**
     * Create a new subscription
     */
    public async createSubscription(req: Request, res: Response) {
        const userId = req.currentUser?.userId;

        const validatedData = createSubscriptionSchema.parse(req.body);

        const planId = parseInt(validatedData.planId as string, 10);

        const timeZone = getTimezoneClient(req);

        // Check if user already has an active subscription
        const existingSubscription = await subscriptionService.getUserActiveSubscription(userId);

        if (existingSubscription) {
            throw new BadRequest('User already has an active subscription');
        }

        // Get plan details to calculate price
        const plans = await subscriptionService.getAvailablePlans();
        const selectedPlan = plans.find(p => p?.planId === planId);

        if (!selectedPlan) {
            throw new NotFoundError('Plan not found');
        }

        let finalAmount = parseFloat(selectedPlan.price);
        let discountAmount = 0;

        const params = {
            userId,
            planId,
            paymentData: {
                amount: finalAmount,
                currency: selectedPlan.currency,
                externalSubscriptionId: validatedData?.externalSubscriptionId,
                paymentMethod: validatedData?.paymentMethod,
            },
            interval: selectedPlan.billingInterval,
            timeZone,
        };

        // Create subscription
        const subscription = await subscriptionService.createSubscription(params);

        SuccessResponse.created(
            res,
            {
                subscription,
                originalAmount: parseFloat(selectedPlan.price),
                discountAmount,
                finalAmount,
            },
            'Subscription created successfully'
        );
    }

    /**
     * Update subscription
     */
    updateSubscription = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;

        const validatedData = updateSubscriptionSchema.parse(req.body);
        const subscriptionId = parseInt(validatedData.subscriptionId as string);

        const timeZone = getTimezoneClient(req);
        const date = getCurrentDateInTimeZone(timeZone);

        // Verify subscription belongs to user
        const subscription = await subscriptionService.getUserActiveSubscription(userId);

        if (!subscription || subscription.subscriptionId !== subscriptionId) {
            throw new NotFoundError('Subscription not found');
        }

        // Handle cancellation
        if (validatedData.status === 'cancelled') {
            const success = await subscriptionService.cancelSubscription(
                subscriptionId,
                validatedData.cancellationReason,
                date
            );

            if (!success) {
                throw new InternalServerError('Failed to cancel subscription');
            }
        }

        SuccessResponse.created(res, {}, 'Subscription updated successfully');
    };

    /**
     * Upgrade subscription to a new plan
     * This method allows users to upgrade their subscription plan.
     */
    async changeSubscription(req: Request, res: Response) {
        const userId = req.currentUser?.userId;

        let validatedData;

        try {
            validatedData = upgradeSubscriptionSchema.parse(req.body);
        } catch {
            throw new BadRequest('Invalid request data');
        }
        
        const planId = parseInt(validatedData.planId as string, 10);
        const timeZone = getTimezoneClient(req);

        const paymentData = {
            amount: validatedData.paymentData?.amount,
            currency: validatedData.paymentData?.currency,
            externalSubscriptionId: validatedData.paymentData?.externalSubscriptionId,
        };

        const upgradeResult = await subscriptionService.changeSubscription({
            userId,
            newPlanId: planId,
            timeZone,
            paymentData,
        });

        SuccessResponse.ok(res, upgradeResult, 'Subscription upgraded successfully');
    }

    /**
     * Check feature usage limit
     */
    checkFeatureUsage = async (req: Request, res: Response) => {
        const userId = req?.currentUser?.userId;

        const validatedData = checkFeatureUsageSchema.parse(req.body);

        const result = await subscriptionService.canUseFeature(
            userId,
            validatedData.featureName,
            validatedData.requestedAmount
        );

        SuccessResponse.ok(res, result);
    };

    /**
     * Record feature usage
     */
    recordFeatureUsage = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;

        const validatedData = recordFeatureUsageSchema.parse(req.body);

        // Check if user can use the feature
        const canUse = await subscriptionService.canUseFeature(
            userId,
            validatedData.featureName,
            validatedData.usageAmount
        );

        if (!canUse.canUse) {
            throw new PaymentRequire('Feature usage limit exceeded. Please upgrade your plan.');
        }

        const success = await subscriptionService.recordFeatureUsage(
            userId,
            validatedData.featureName,
            validatedData.usageAmount
        );

        if (!success) {
            throw new InternalServerError('Failed to record feature usage');
        }

        SuccessResponse.ok(res, {}, 'Feature usage recorded successfully');
    };

    /**
     * Get user's feature usage summary
     */
    getFeatureUsage = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;

        const usage = await subscriptionService.getUserFeatureUsage(userId);

        SuccessResponse.ok(res, usage, 'Feature usage retrieved successfully');
    };

    /**
     * Cancel subscription
     */
    public async cancelSubscription(req: Request, res: Response) {
        const userId = req.currentUser?.userId;

        const validatedData = updateSubscriptionSchema.parse(req.body);

        const date = getCurrentDateInTimeZone(getTimezoneClient(req));

        // Verify user has an active subscription
        const subscription = await subscriptionService.getUserActiveSubscription(userId);
        if (!subscription) {
            throw new NotFoundError('No active subscription found');
        }

        // Cancel the subscription
        const success = await subscriptionService.cancelSubscription(
            subscription.subscriptionId,
            validatedData.cancellationReason,
            date
        );

        if (!success) {
            throw new InternalServerError('Failed to cancel subscription');
        }

        SuccessResponse.accepted(res, {}, 'Subscription cancelled successfully');
    }
}

export default new SubscriptionController();
