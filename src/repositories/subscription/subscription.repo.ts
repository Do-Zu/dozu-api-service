import { and, eq, gt } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';
import { featuresTable, planFeaturesTable, plansTable, userSubscriptionsTable } from '@/models';

class SubscriptionRepo {
    private readonly SELECT_FIELDS_PLAN_WITH_FEATURES = {
        planId: plansTable.planId,
        name: plansTable.name,
        description: plansTable.description,
        planType: plansTable.planType,
        billingInterval: plansTable.billingInterval,
        price: plansTable.price,
        currency: plansTable.currency,
        isActive: plansTable.isActive,
        tier: plansTable.tier,
        featureId: featuresTable.featureId,
        featureName: featuresTable.name,
        featureDescription: featuresTable.description,
        booleanValue: planFeaturesTable.booleanValue,
        numericValue: planFeaturesTable.numericValue,
        textValue: planFeaturesTable.textValue,
        isUnlimited: planFeaturesTable.isUnlimited,
        isEnabled: planFeaturesTable.isEnabled,
    };
    /**
     * Get all available plans with their features in a single query
     */
    public async getAllPlansWithFeatures() {
        const result = await db
            .select(this.SELECT_FIELDS_PLAN_WITH_FEATURES)
            .from(plansTable)
            .leftJoin(planFeaturesTable, eq(plansTable.planId, planFeaturesTable.planId))
            .leftJoin(
                featuresTable,
                and(eq(planFeaturesTable.featureId, featuresTable.featureId), eq(featuresTable.isActive, true))
            )
            .where(eq(plansTable.isActive, true));

        return result;
    }

    /**
     * Get upgrade plans with features in a single query
     */
    public async filterPlansWithFeaturesForUpgrade(payload: { tier: number }) {
        const { tier } = payload;

        const result = await db
            .select(this.SELECT_FIELDS_PLAN_WITH_FEATURES)
            .from(plansTable)
            .leftJoin(planFeaturesTable, eq(plansTable.planId, planFeaturesTable.planId))
            .leftJoin(
                featuresTable,
                and(eq(planFeaturesTable.featureId, featuresTable.featureId), eq(featuresTable.isActive, true))
            )
            .where(and(gt(plansTable.tier, tier), eq(plansTable.isActive, true)));

        return result;
    }

    /**
     * Get plan features by plan ID
     * @param planId - The ID of the plan to get features for
     */
    public async getPlanFeaturesAvailable() {
        const features = await db
            .select({
                planId: planFeaturesTable.planId,
                featureId: featuresTable.featureId,
                name: featuresTable.name,
                description: featuresTable.description,
                booleanValue: planFeaturesTable.booleanValue,
                numericValue: planFeaturesTable.numericValue,
                textValue: planFeaturesTable.textValue,
                isUnlimited: planFeaturesTable.isUnlimited,
                isEnabled: planFeaturesTable.isEnabled,
            })
            .from(planFeaturesTable)
            .fullJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(eq(featuresTable.isActive, true));

        return features;
    }

    /**
     * Get user's subscription with plan details
     */
    public async getUserSubscriptionWithPlan(userId: number) {
        const result = await db
            .select({
                subscription: userSubscriptionsTable,
                plan: {
                    planId: plansTable.planId,
                    name: plansTable.name,
                    description: plansTable.description,
                    price: plansTable.price,
                    isActive: plansTable.isActive,
                    planType: plansTable.planType,
                    tier: plansTable.tier,
                },
            })
            .from(userSubscriptionsTable)
            .innerJoin(plansTable, eq(userSubscriptionsTable.planId, plansTable.planId))
            .where(and(eq(userSubscriptionsTable.userId, userId), eq(userSubscriptionsTable.status, 'active')))
            .limit(1);

        return result[0] || null;
    }
}

export default new SubscriptionRepo();
