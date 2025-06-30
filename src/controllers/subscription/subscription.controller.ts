import { Request, Response } from 'express';
import subscriptionService from '@/services/subscription/subscription.service';
import { BadRequest, InternalServerError, NotFoundError, PaymentRequire } from '@/core/error';
import {
    createSubscriptionSchema,
    updateSubscriptionSchema,
    recordFeatureUsageSchema,
    checkFeatureUsageSchema,
} from '@/dtos/subscription/subscription.dto';
import { SuccessResponse } from '@/core/success';

export class SubscriptionController {
    /**
     * Get all available plans with features
     */
    getPlans = async (req: Request, res: Response) => {
        const plans = await subscriptionService.getAvailablePlans();

        SuccessResponse.ok(res, plans, 'Plans retrieved successfully');
    };

    /**
     * Get current user's subscription
     */
    getCurrentSubscription = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;

        const subscription = await subscriptionService.getUserSubscriptionWithPlan(userId);

        SuccessResponse.ok(res, subscription, 'Subscription retrieved successfully');
    };

    /**
     * Create a new subscription
     */
    createSubscription = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;

        const validatedData = createSubscriptionSchema.parse(req.body);

        // Check if user already has an active subscription
        const existingSubscription = await subscriptionService.getUserActiveSubscription(userId);
        if (existingSubscription) {
            throw new BadRequest('User already has an active subscription');
        }

        // Get plan details to calculate price
        const plans = await subscriptionService.getAvailablePlans();
        const selectedPlan = plans.find(p => p?.plan?.planId === validatedData.planId);

        if (!selectedPlan) {
            throw new NotFoundError('Plan not found');
        }

        let finalAmount = parseFloat(selectedPlan.plan.price);
        let discountAmount = 0;

        // Create subscription
        const subscription = await subscriptionService.createSubscription(userId, validatedData.planId, {
            amount: finalAmount,
            currency: selectedPlan.plan.currency,
            externalSubscriptionId: validatedData.externalSubscriptionId,
            paymentMethod: validatedData.paymentMethod,
        });

        SuccessResponse.created(
            res,
            {
                subscription,
                originalAmount: parseFloat(selectedPlan.plan.price),
                discountAmount,
                finalAmount,
            },
            'Subscription created successfully'
        );
    };

    /**
     * Update subscription
     */
    updateSubscription = async (req: Request, res: Response) => {
        const userId = req.currentUser?.userId;
        const subscriptionId = parseInt(req.params.subscriptionId);

        const validatedData = updateSubscriptionSchema.parse(req.body);

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
                validatedData.cancelAt ? new Date(validatedData.cancelAt) : undefined
            );

            if (!success) {
                throw new InternalServerError('Failed to cancel subscription');
            }
        }

        SuccessResponse.created(res, {}, 'Subscription updated successfully');
    };

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
}

export default new SubscriptionController();
