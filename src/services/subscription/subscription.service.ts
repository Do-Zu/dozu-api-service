import db from '@/libs/drizzleClient.lib';
import { eq, and, desc, gte } from 'drizzle-orm';
import {
    plansTable,
    featuresTable,
    planFeaturesTable,
    userSubscriptionsTable,
    userFeatureUsageTable,
    type InsertUserSubscription,
    type SelectUserSubscription,
    type InsertUserFeatureUsage,
} from '@/models/subscription';

export class SubscriptionService {
    /**
     * Get all available plans with their features
     */
    async getAvailablePlans() {
        return [];
    }

    /**
     * Get user's current active subscription
     */
    async getUserActiveSubscription(userId: number): Promise<SelectUserSubscription | null> {
        const subscription = await db
            .select()
            .from(userSubscriptionsTable)
            .where(
                and(
                    eq(userSubscriptionsTable.userId, userId),
                    eq(userSubscriptionsTable.status, 'active'),
                    gte(userSubscriptionsTable.currentPeriodEnd, new Date())
                )
            )
            .orderBy(desc(userSubscriptionsTable.createdAt))
            .limit(1);

        return subscription[0] || null;
    }

    /**
     * Get user's subscription with plan details
     */
    async getUserSubscriptionWithPlan(userId: number) {
        const result = await db
            .select({
                subscription: userSubscriptionsTable,
                plan: plansTable,
            })
            .from(userSubscriptionsTable)
            .innerJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(
                and(
                    eq(userSubscriptionsTable.userId, userId),
                    eq(userSubscriptionsTable.status, 'active'),
                    gte(userSubscriptionsTable.currentPeriodEnd, new Date())
                )
            )
            .orderBy(desc(userSubscriptionsTable.createdAt))
            .limit(1);

        return result[0] || null;
    }

    /**
     * Create a new subscription for a user
     */
    async createSubscription(
        userId: number,
        planId: number,
        paymentData: {
            amount: number;
            currency?: string;
            externalSubscriptionId?: string;
            paymentMethod?: string;
        }
    ): Promise<SelectUserSubscription> {
        const now = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // Default to 1 month

        const subscription: InsertUserSubscription = {
            userId,
            planId,
            status: 'pending',
            currentPeriodStart: now,
            currentPeriodEnd,
            paymentStatus: 'pending',
            amount: paymentData.amount.toString(),
            currency: paymentData.currency || 'USD',
            externalSubscriptionId: paymentData.externalSubscriptionId,
            autoRenew: true,
        };

        const [newSubscription] = await db.insert(userSubscriptionsTable).values(subscription).returning();

        // Initialize user feature usage for this subscription
        await this.initializeUserFeatureUsage(userId, planId, newSubscription.subscriptionId);

        return newSubscription;
    }

    /**
     * Initialize user feature usage based on their plan
     */
    private async initializeUserFeatureUsage(userId: number, planId: number, subscriptionId: number) {
        // Get plan features
        const planFeatures = await db
            .select({
                featureId: planFeaturesTable.featureId,
                numericValue: planFeaturesTable.numericValue,
                isUnlimited: planFeaturesTable.isUnlimited,
                feature: featuresTable,
            })
            .from(planFeaturesTable)
            .innerJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(and(eq(planFeaturesTable.planId, planId), eq(planFeaturesTable.isEnabled, true)));

        const now = new Date();
        const resetPeriodEnd = new Date();
        resetPeriodEnd.setMonth(resetPeriodEnd.getMonth() + 1);

        const usageRecords: InsertUserFeatureUsage[] = planFeatures.map(pf => ({
            userId,
            featureId: pf.featureId,
            subscriptionId,
            usedValue: '0',
            limitValue: pf.numericValue,
            isUnlimited: pf.isUnlimited,
            resetPeriodStart: now,
            resetPeriodEnd,
        }));

        if (usageRecords.length > 0) {
            await db.insert(userFeatureUsageTable).values(usageRecords);
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
    async cancelSubscription(subscriptionId: number, reason?: string, cancelAt?: Date): Promise<boolean> {
        const result = await db
            .update(userSubscriptionsTable)
            .set({
                status: 'cancelled',
                canceledAt: new Date(),
                cancellationReason: reason,
                cancelAt: cancelAt,
                autoRenew: false,
                updatedAt: new Date(),
            })
            .where(eq(userSubscriptionsTable.subscriptionId, subscriptionId))
            .returning();

        return result.length > 0;
    }

    /**
     * Upgrade/downgrade subscription
     */
    async changeSubscription(
        userId: number,
        newPlanId: number,
        paymentData: {
            amount: number;
            currency?: string;
            externalSubscriptionId?: string;
        }
    ): Promise<SelectUserSubscription | null> {
        // Get current subscription
        const currentSubscription = await this.getUserActiveSubscription(userId);

        if (!currentSubscription) {
            return null;
        }

        // Cancel current subscription
        await this.cancelSubscription(currentSubscription.subscriptionId, 'Plan change');

        // Create new subscription
        const newSubscription = await this.createSubscription(userId, newPlanId, paymentData);

        return newSubscription;
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
                paymentStatus: 'pending',
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
