import { NotFoundError } from '@/core/error';
import db from '@/libs/drizzleClient.lib';
import { IBillingInterval, IPlanType, plansTable } from '@/models';
import { and, eq } from 'drizzle-orm';

export interface IPlanConfiguration {
    planType: IPlanType;
    billingInterval: IBillingInterval;
    features: {
        maxUsers?: number;
        maxProjects?: number;
        storageGB?: number;
        apiCallsPerMonth?: number;
        customDomain?: boolean;
        prioritySupport?: boolean;
        advancedAnalytics?: boolean;
        teamCollaboration?: boolean;
    };
    limitations: {
        canUpgrade: boolean;
        canDowngrade: boolean;
        requiresPayment: boolean;
    };
}

class PlanService {
    /**
     * Get plan by type and billing interval
     */
    public async getPlanByTypeAndInterval(planType: IPlanType, intervalType: IBillingInterval) {
        const plan = await db
            .select({
                planId: plansTable.planId,
                name: plansTable.name,
                description: plansTable.description,
                price: plansTable.price,
                isActive: plansTable.isActive,
                planType: plansTable.planType
            })
            .from(plansTable)
            .where(
                and(
                    eq(plansTable.planType, planType),
                    eq(plansTable.billingInterval, intervalType),
                    eq(plansTable.isActive, true)
                )
            )
            .limit(1);

        if (!plan?.[0]) {
            throw new NotFoundError(`Plan not found for type: ${planType} and interval: ${intervalType}`);
        }

        return plan[0];
    }

    /**
     * Get free plan (default)
     */
    public async getFreePlan() {
        return await this.getPlanByTypeAndInterval('free', 'monthly');
    }

    public async getPlanById(planId: number) {
        const plan = await db
            .select()
            .from(plansTable)
            .where(and(eq(plansTable.planId, planId), eq(plansTable.isActive, true)))
            .limit(1);

        if (!plan?.[0]) {
            throw new NotFoundError(`Plan not found with ID: ${planId}`);
        }
        return plan[0];
    }

    // private getPlanConfiguration(planType: IPlanType, intervalType: IBillingInterval) {}
}

export default new PlanService();
