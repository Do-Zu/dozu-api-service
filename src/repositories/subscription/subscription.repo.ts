import { and, eq } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';
import { featuresTable, planFeaturesTable, plansTable, userSubscriptionsTable } from '@/models';

class SubscriptionRepo {
    /**
     * Get all available plans with features
     */
    public async getAllPlansAvailable() {
        const plans = await db
            .select({
                planId: plansTable.planId,
                name: plansTable.name,
                description: plansTable.description,
                planType: plansTable.planType,
                billingInterval: plansTable.billingInterval,
                price: plansTable.price,
                currency: plansTable.currency,
                isActive: plansTable.isActive,
            })
            .from(plansTable)
            .where(eq(plansTable.isActive, true));
        return plans;
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
