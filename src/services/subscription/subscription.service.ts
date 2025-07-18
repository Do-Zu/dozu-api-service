import { NotFoundError } from '@/core/error';
import db, { Transaction } from '@/libs/drizzleClient.lib';
import {
    featuresTable,
    IBillingInterval,
    planFeaturesTable,
    userFeatureUsageTable,
    userSubscriptionsTable,
    type InsertUserFeatureUsage,
    type InsertUserSubscription,
    type SelectUserSubscription,
} from '@/models/subscription';
import subscriptionRepo from '@/repositories/subscription/subscription.repo';
import { getCurrentDateInTimeZone } from '@/utils/date';
import { addMonths, addYears } from 'date-fns';
import { and, desc, eq, gte } from 'drizzle-orm';
import planService from './plan.service';
import { featureUsageService } from './usage/featureUsage.service';

export interface IFeature {
    planId: number;
    featureId: number;
    name: string;
    description?: string;
    booleanValue?: boolean;
    numericValue?: string;
    textValue?: string;
    isUnlimited: boolean;
    isEnabled: boolean;
}
export interface SelectPlanWithFeatures {
    planId: number;
    name: string;
    description?: string;
    planType: string;
    billingInterval: string;
    price: string;
    currency: string;
    isActive: boolean;
    features: IFeature[];
}
export class SubscriptionService {
    private readonly DEFAULT_VALUE_USAGE = '0';
    private readonly DEFAULT_CURRENCY = 'USD';

    /**
     * Get all available plans with their features
     */
    public async getAvailablePlans() {
        const plans = await subscriptionRepo.getAllPlansAvailable();

        if (!plans || plans.length === 0) {
            throw new NotFoundError('No plans available');
        }

        if (!plans || plans.length === 0) {
            throw new NotFoundError('No plans available');
        }

        const planFeatures = (await subscriptionRepo.getPlanFeaturesAvailable()) as IFeature[];

        if (!planFeatures || planFeatures.length === 0) {
            throw new NotFoundError('No plan features available');
        }

        const mapPlanFeatures = new Map<number, IFeature[]>();

        planFeatures?.forEach(feature => {
            if (!feature || feature?.planId === null) {
                throw new NotFoundError(`Feature ${feature.featureId} is not associated with any plan`);
            }

            if (!mapPlanFeatures.has(feature.planId)) {
                mapPlanFeatures.set(feature.planId, []);
            }

            mapPlanFeatures?.get(feature.planId)?.push(feature);
        });

        const plansWithFeatures = plans.map(plan => {
            const features = mapPlanFeatures.get(plan.planId) || [];
            return {
                ...plan,
                features,
            };
        });

        return plansWithFeatures as SelectPlanWithFeatures[];
    }

    public async getFeatureAbilityOfPlan({ planId, featureId }: { planId: number; featureId: number }) {
        const feature = await db
            .select({
                planFeatureId: planFeaturesTable.planFeatureId,
                featureType: featuresTable.featureType,
                interval: planFeaturesTable.interval,
                category: featuresTable.category,
                unit: featuresTable.unit,
                sortOrder: featuresTable.sortOrder,
                booleanValue: planFeaturesTable.booleanValue,
                numericValue: planFeaturesTable.numericValue,
                textValue: planFeaturesTable.textValue,
                isUnlimited: planFeaturesTable.isUnlimited,
                isEnabled: planFeaturesTable.isEnabled,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(
                and(
                    eq(planFeaturesTable.planId, planId),
                    eq(planFeaturesTable.featureId, featureId),
                    eq(planFeaturesTable.isEnabled, true),
                    eq(featuresTable.isActive, true)
                )
            )
            .limit(1);

        if (!feature[0]) {
            throw new NotFoundError(`Feature ${featureId} not found for plan ${planId}`);
        }

        return feature[0];
    }

    public async getAllFeaturesOfPlan({ planId }: { planId: number }) {
        const features = await db
            .select({
                featureId: featuresTable.featureId,
                name: featuresTable.name,
                description: featuresTable.description,
                featureType: featuresTable.featureType,
                featureIntervalExpire: planFeaturesTable.interval,
                category: featuresTable.category,
                unit: featuresTable.unit,
                apiUrl: planFeaturesTable.apiUrl,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(and(eq(planFeaturesTable.planId, planId), eq(featuresTable.isActive, true)));

        return features;
    }

    /**
     * Get user's current active subscription
     */
    async getUserActiveSubscription(userId: number): Promise<SelectUserSubscription | null> {
        const subscription = await db
            .select()
            .from(userSubscriptionsTable)
            .where(and(eq(userSubscriptionsTable.userId, userId), eq(userSubscriptionsTable.status, 'active')))
            .orderBy(desc(userSubscriptionsTable.createdAt))
            .limit(1);

        return subscription[0] || null;
    }

    /**
     * Get user's subscription with plan details
     */
    async getUserSubscriptionWithPlan({ userId, timezone }: { userId: number; timezone: string }) {
        const result = await subscriptionRepo.getUserSubscriptionWithPlan(userId);

        if (!result) {
            return await this.createSubscriptionFreePlan({ userId, timezone });
        }

        return result;
    }

    private async createSubscriptionFreePlan({ userId, timezone }: { userId: number; timezone: string }) {
        const freePlan = await planService.getFreePlan();

        const resultCreteSubScriptionFreePlan = await this.createSubscription({
            userId,
            planId: freePlan.planId,
            paymentData: {
                amount: 0,
            },
            timeZone: timezone,
        });

        if (!resultCreteSubScriptionFreePlan) {
            throw new NotFoundError('Failed to create subscription for free plan');
        }

        return {
            plan: freePlan,
            subscription: resultCreteSubScriptionFreePlan,
        };
    }

    /**
     * Create a new subscription for a user
     */
    public async createSubscription(params: {
        userId: number;
        planId: number;
        paymentData: {
            amount: number;
            currency?: string;
            externalSubscriptionId?: string;
        };
        timeZone: string;
    }): Promise<SelectUserSubscription> {
        const { userId, planId, paymentData, timeZone } = params;

        const { planType, billingInterval } = await planService.getPlanById(planId);

        if (!planType || !billingInterval) {
            throw new NotFoundError(`Plan with ID ${planId} not found`);
        }

        return await db.transaction(async tx => {
            const startDateSubscription = getCurrentDateInTimeZone(timeZone);
            const endDateSubscription = this.calculateSubscriptionEndDate(billingInterval, startDateSubscription);

            const subscription: InsertUserSubscription = {
                userId,
                planId,
                status: 'active',
                currentPeriodStart: startDateSubscription,
                currentPeriodEnd: endDateSubscription,
                externalSubscriptionId: paymentData?.externalSubscriptionId,
                autoRenew: true,
            };

            const [newSubscription] = await tx.insert(userSubscriptionsTable).values(subscription).returning();

            // Initialize user feature usage for this subscription
            await this.initializeUserFeatureUsage({
                tx,
                userId,
                planId,
                subscriptionId: newSubscription.subscriptionId,
                timeZone,
            });

            return newSubscription;
        });
    }

    private calculateSubscriptionEndDate(billingInterval: IBillingInterval, startDateSubscription: Date) {
        switch (billingInterval) {
            case 'monthly':
                return addMonths(startDateSubscription, 1);
            case 'yearly':
                return addYears(startDateSubscription, 1);
            case 'custom':
                // TODO: Implement custom billing logic for custom intervals
                return startDateSubscription;
            default:
                throw new Error(`Unsupported billing interval: ${billingInterval}`);
        }
    }

    /**
     * Initialize user feature usage based on their plan
     */
    private async initializeUserFeatureUsage({
        tx,
        userId,
        planId,
        subscriptionId,
        timeZone,
    }: {
        tx: Transaction;
        userId: number;
        planId: number;
        subscriptionId: number;
        timeZone: string;
    }) {
        // Get plan features
        const planFeatures = await tx
            .select({
                featureId: planFeaturesTable.featureId,
                numericValue: planFeaturesTable.numericValue,
                isUnlimited: planFeaturesTable.isUnlimited,
                feature: featuresTable,
                interval: planFeaturesTable.interval,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(and(eq(planFeaturesTable.planId, planId), eq(planFeaturesTable.isEnabled, true)));

        if (!planFeatures || planFeatures.length === 0) {
            throw new NotFoundError(`No features found for plan ${planId}`);
        }

        const usageRecords: InsertUserFeatureUsage[] = planFeatures.map(planFeature => {
            const now = getCurrentDateInTimeZone(timeZone);

            const { start, end } = featureUsageService.getPeriodRange({
                date: now,
                timezone: timeZone,
                interval: planFeature.interval,
            });

            return {
                userId,
                featureId: planFeature.featureId,
                subscriptionId,
                usedValue: this.DEFAULT_VALUE_USAGE,
                limitValue: planFeature.numericValue ? planFeature.numericValue.toString() : null,
                isUnlimited: planFeature.isUnlimited,
                resetPeriodStart: start,
                resetPeriodEnd: end,
                lastResetAt: now,
                updatedAt: now,
            };
        });

        if (usageRecords.length > 0) {
            await tx.insert(userFeatureUsageTable).values(usageRecords);
        }
    }

    /**
     * Check if user can use a feature
     */
    async canUseFeature(
        userId: number,
        featureName: string,
        requestedAmount: number = 1
    ): Promise<{ canUse: boolean; remaining?: number; isUnlimited?: boolean }> {
        const feature = await db.select().from(featuresTable).where(eq(featuresTable.name, featureName)).limit(1);

        if (!feature[0]) {
            return { canUse: false };
        }

        const usage = await db
            .select()
            .from(userFeatureUsageTable)
            .where(
                and(
                    eq(userFeatureUsageTable.userId, userId),
                    eq(userFeatureUsageTable.featureId, feature[0].featureId),
                    gte(userFeatureUsageTable.resetPeriodEnd, new Date())
                )
            )
            .limit(1);

        if (!usage[0]) {
            return { canUse: false };
        }

        if (usage[0].isUnlimited) {
            return { canUse: true, isUnlimited: true };
        }

        const used = parseFloat(usage[0].usedValue);
        const limit = usage[0].limitValue ? parseFloat(usage[0].limitValue) : 0;
        const remaining = limit - used;

        return {
            canUse: remaining >= requestedAmount,
            remaining,
            isUnlimited: false,
        };
    }

    /**
     * Record feature usage
     */
    async recordFeatureUsage(userId: number, featureName: string, usageAmount: number = 1): Promise<boolean> {
        const feature = await db.select().from(featuresTable).where(eq(featuresTable.name, featureName)).limit(1);

        if (!feature[0]) {
            return false;
        }

        const usage = await db
            .select()
            .from(userFeatureUsageTable)
            .where(
                and(
                    eq(userFeatureUsageTable.userId, userId),
                    eq(userFeatureUsageTable.featureId, feature[0].featureId),
                    gte(userFeatureUsageTable.resetPeriodEnd, new Date())
                )
            )
            .limit(1);

        if (!usage[0]) {
            return false;
        }

        if (usage[0].isUnlimited) {
            return true; // No need to track usage for unlimited features
        }

        const currentUsed = parseFloat(usage[0].usedValue);
        const newUsed = currentUsed + usageAmount;

        await db
            .update(userFeatureUsageTable)
            .set({
                usedValue: newUsed.toString(),
                updatedAt: new Date(),
            })
            .where(eq(userFeatureUsageTable.usageId, usage[0].usageId));

        return true;
    }

    /**
     * Get user's feature usage summary
     */
    async getUserFeatureUsage(userId: number) {
        const usages = await db
            .select({
                usage: userFeatureUsageTable,
                feature: featuresTable,
            })
            .from(userFeatureUsageTable)
            .innerJoin(featuresTable, eq(userFeatureUsageTable.featureId, featuresTable.featureId))
            .where(
                and(eq(userFeatureUsageTable.userId, userId), gte(userFeatureUsageTable.resetPeriodEnd, new Date()))
            );

        return usages.map(u => ({
            featureName: u.feature.name,
            category: u.feature.category,
            featureType: u.feature.featureType,
            unit: u.feature.unit,
            used: parseFloat(u.usage.usedValue),
            limit: u.usage.limitValue ? parseFloat(u.usage.limitValue) : null,
            isUnlimited: u.usage.isUnlimited,
            usagePercentage: u.usage.isUnlimited
                ? 0
                : u.usage.limitValue
                  ? (parseFloat(u.usage.usedValue) / parseFloat(u.usage.limitValue)) * 100
                  : 0,
            resetPeriodEnd: u.usage.resetPeriodEnd,
        }));
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(subscriptionId: number, reason?: string, cancelTime?: Date): Promise<boolean> {
        const result = await db
            .update(userSubscriptionsTable)
            .set({
                status: 'cancelled',
                canceledAt: cancelTime,
                cancellationReason: reason,
                cancelAt: cancelTime,
                autoRenew: false,
                updatedAt: cancelTime,
            })
            .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId))
            .returning();

        return result.length > 0;
    }

    public async changeSubscription({
        userId,
        newPlanId,
        timeZone,
        paymentData,
    }: {
        userId: number;
        newPlanId: number;
        timeZone: string;
        paymentData?: {
            currency?: string;
            externalSubscriptionId?: string;
        };
    }): Promise<SelectUserSubscription | null> {
        return await db.transaction(async tx => {
            // Get current subscription
            const currentSubscription = await tx
                .select()
                .from(userSubscriptionsTable)
                .where(and(eq(userSubscriptionsTable.userId, userId), eq(userSubscriptionsTable.status, 'active')))
                .limit(1);

            if (!currentSubscription[0]) {
                return null;
            }

            const currentDate = getCurrentDateInTimeZone(timeZone);

            // Cancel current subscription within transaction
            await tx
                .update(userSubscriptionsTable)
                .set({
                    status: 'cancelled',
                    canceledAt: currentDate,
                    cancellationReason: 'Plan change',
                    autoRenew: false,
                    updatedAt: currentDate,
                })
                .where(eq(userSubscriptionsTable.subscriptionId, currentSubscription[0].subscriptionId));

            // Create new subscription within same transaction
            const { planType, billingInterval } = await planService.getPlanById(newPlanId);

            if (!planType || !billingInterval) {
                throw new NotFoundError(`Plan unavailable!`);
            }

            const startDateSubscription = getCurrentDateInTimeZone(timeZone);
            const endDateSubscription = this.calculateSubscriptionEndDate(billingInterval, startDateSubscription);

            const subscription: InsertUserSubscription = {
                userId,
                planId: newPlanId,
                status: 'active',
                currentPeriodStart: startDateSubscription,
                currentPeriodEnd: endDateSubscription,
                externalSubscriptionId: paymentData?.externalSubscriptionId,
                autoRenew: false,
            };

            const [newSubscription] = await tx.insert(userSubscriptionsTable).values(subscription).returning();

            // Initialize feature usage for new subscription
            await this.initializeUserFeatureUsage({
                tx,
                userId,
                planId: newPlanId,
                subscriptionId: newSubscription.subscriptionId,
                timeZone,
            });

            return newSubscription;
        });
    }

    /**
     * Process subscription renewal
     */
    async processRenewal(subscriptionId: number): Promise<boolean> {
        const subscription = await db
            .select()
            .from(userSubscriptionsTable)
            .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId))
            .limit(1);

        if (!subscription[0] || !subscription[0].autoRenew) {
            return false;
        }

        const currentPeriodEnd = new Date(subscription[0].currentPeriodEnd);
        const newPeriodStart = currentPeriodEnd;
        const newPeriodEnd = new Date(currentPeriodEnd);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await db
            .update(userSubscriptionsTable)
            .set({
                currentPeriodStart: newPeriodStart,
                currentPeriodEnd: newPeriodEnd,
                updatedAt: new Date(),
            })
            .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId));

        // Reset feature usage for the new period
        await this.resetFeatureUsage(subscription[0].userId, subscriptionId);

        return true;
    }

    /**
     * Reset feature usage for a new billing period
     */
    private async resetFeatureUsage(userId: number, subscriptionId: number) {
        const now = new Date();
        const resetPeriodEnd = new Date();
        resetPeriodEnd.setMonth(resetPeriodEnd.getMonth() + 1);

        await db
            .update(userFeatureUsageTable)
            .set({
                usedValue: '0',
                resetPeriodStart: now,
                resetPeriodEnd,
                lastResetAt: now,
                updatedAt: now,
            })
            .where(
                and(eq(userFeatureUsageTable.userId, userId), eq(userFeatureUsageTable.subscriptionId, subscriptionId))
            );
    }
}

export default new SubscriptionService();
