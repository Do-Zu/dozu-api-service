import db from '@/libs/drizzleClient.lib';
import { eq, and, desc } from 'drizzle-orm';
import { plansTable, featuresTable, planFeaturesTable } from '@/models/subscription';
import { NotFoundError, BadRequest } from '@/core/error';
import {
    CreatePlanDto,
    UpdatePlanDto,
    CreateFeatureDto,
    UpdateFeatureDto,
    AssignFeatureToPlanDto,
    UpdatePlanFeatureDto,
    BulkUpdatePlanFeaturesDto,
} from '@/dtos/admin/subscription.dto';

class AdminSubscriptionService {
    // ============ PLAN MANAGEMENT ============
    
    async getAllPlans() {
        const plans = await db
            .select()
            .from(plansTable)
            .orderBy(desc(plansTable.createdAt));
        return plans;
    }

    async getPlanById(planId: number) {
        const plan = await db.select().from(plansTable).where(eq(plansTable.planId, planId)).limit(1);
        return plan[0] || null;
    }

    async createPlan(data: CreatePlanDto) {
        const result = await db.insert(plansTable).values({
            name: data.name,
            description: data.description,
            planType: data.planType,
            billingInterval: data.billingInterval,
            price: data.price,
            currency: data.currency,
            isActive: data.isActive,
        }).returning();

        return result[0];
    }

    async updatePlan(planId: number, data: UpdatePlanDto) {
        const plan = await this.getPlanById(planId);
        if (!plan) throw new NotFoundError('Plan not found');

        const result = await db
            .update(plansTable)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(plansTable.planId, planId))
            .returning();

        return result[0];
    }

    async togglePlanActive(planId: number, isActive: boolean) {
        const plan = await this.getPlanById(planId);
        if (!plan) throw new NotFoundError('Plan not found');

        const result = await db
            .update(plansTable)
            .set({ isActive, updatedAt: new Date() })
            .where(eq(plansTable.planId, planId))
            .returning();

        return result[0];
    }

    async deletePlan(planId: number) {
        const plan = await this.getPlanById(planId);
        if (!plan) throw new NotFoundError('Plan not found');

        // Check if any active subscriptions exist for this plan
        // This would require joining with userSubscriptionsTable
        // For now, we'll just delete

        await db.delete(plansTable).where(eq(plansTable.planId, planId));
        return true;
    }

    // ============ FEATURE MANAGEMENT ============

    async getAllFeatures() {
        const features = await db
            .select()
            .from(featuresTable)
            .orderBy(featuresTable.sortOrder, desc(featuresTable.createdAt));
        return features;
    }

    async getFeatureById(featureId: number) {
        const feature = await db
            .select()
            .from(featuresTable)
            .where(eq(featuresTable.featureId, featureId))
            .limit(1);
        return feature[0] || null;
    }

    async createFeature(data: CreateFeatureDto) {
        const result = await db.insert(featuresTable).values({
            name: data.name,
            description: data.description,
            featureType: data.featureType,
            category: data.category,
            unit: data.unit,
            isActive: data.isActive,
            sortOrder: data.sortOrder,
        }).returning();

        return result[0];
    }

    async updateFeature(featureId: number, data: UpdateFeatureDto) {
        const feature = await this.getFeatureById(featureId);
        if (!feature) throw new NotFoundError('Feature not found');

        const result = await db
            .update(featuresTable)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(featuresTable.featureId, featureId))
            .returning();

        return result[0];
    }

    async deleteFeature(featureId: number) {
        const feature = await this.getFeatureById(featureId);
        if (!feature) throw new NotFoundError('Feature not found');

        await db.delete(featuresTable).where(eq(featuresTable.featureId, featureId));
        return true;
    }

    // ============ PLAN-FEATURE MAPPING ============

    async getPlanFeatures(planId: number) {
        const plan = await this.getPlanById(planId);
        if (!plan) throw new NotFoundError('Plan not found');

        const planFeatures = await db
            .select({
                planFeatureId: planFeaturesTable.planFeatureId,
                planId: planFeaturesTable.planId,
                featureId: planFeaturesTable.featureId,
                featureName: featuresTable.name,
                featureDescription: featuresTable.description,
                featureType: featuresTable.featureType,
                category: featuresTable.category,
                unit: featuresTable.unit,
                booleanValue: planFeaturesTable.booleanValue,
                numericValue: planFeaturesTable.numericValue,
                textValue: planFeaturesTable.textValue,
                interval: planFeaturesTable.interval,
                apiUrl: planFeaturesTable.apiUrl,
                isUnlimited: planFeaturesTable.isUnlimited,
                isEnabled: planFeaturesTable.isEnabled,
            })
            .from(planFeaturesTable)
            .leftJoin(featuresTable, eq(planFeaturesTable.featureId, featuresTable.featureId))
            .where(eq(planFeaturesTable.planId, planId));

        return planFeatures;
    }

    async assignFeatureToPlan(data: AssignFeatureToPlanDto) {
        // Verify plan and feature exist
        const plan = await this.getPlanById(data.planId);
        if (!plan) throw new NotFoundError('Plan not found');

        const feature = await this.getFeatureById(data.featureId);
        if (!feature) throw new NotFoundError('Feature not found');

        // Check if already exists
        const existing = await db
            .select()
            .from(planFeaturesTable)
            .where(
                and(
                    eq(planFeaturesTable.planId, data.planId),
                    eq(planFeaturesTable.featureId, data.featureId)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            throw new BadRequest('This feature is already assigned to this plan');
        }

        const result = await db.insert(planFeaturesTable).values({
            planId: data.planId,
            featureId: data.featureId,
            booleanValue: data.booleanValue,
            numericValue: data.numericValue,
            textValue: data.textValue,
            interval: data.interval,
            apiUrl: data.apiUrl,
            isUnlimited: data.isUnlimited,
            isEnabled: data.isEnabled,
        }).returning();

        return result[0];
    }

    async updatePlanFeature(planFeatureId: number, data: UpdatePlanFeatureDto) {
        const result = await db
            .update(planFeaturesTable)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(planFeaturesTable.planFeatureId, planFeatureId))
            .returning();

        if (result.length === 0) {
            throw new NotFoundError('Plan feature not found');
        }

        return result[0];
    }

    async removeFeatureFromPlan(planFeatureId: number) {
        await db.delete(planFeaturesTable).where(eq(planFeaturesTable.planFeatureId, planFeatureId));
        return true;
    }

    async bulkUpdatePlanFeatures(data: BulkUpdatePlanFeaturesDto) {
        const plan = await this.getPlanById(data.planId);
        if (!plan) throw new NotFoundError('Plan not found');

        // Delete all existing features for this plan
        await db.delete(planFeaturesTable).where(eq(planFeaturesTable.planId, data.planId));

        // Insert new features
        if (data.features.length > 0) {
            const values = data.features.map((f) => ({
                planId: data.planId,
                featureId: f.featureId,
                booleanValue: f.booleanValue,
                numericValue: f.numericValue,
                textValue: f.textValue,
                interval: f.interval,
                apiUrl: f.apiUrl,
                isUnlimited: f.isUnlimited,
                isEnabled: f.isEnabled,
            }));

            await db.insert(planFeaturesTable).values(values);
        }

        return this.getPlanFeatures(data.planId);
    }

    // ============ GET PLAN WITH FEATURES ============

    async getPlanWithFeatures(planId: number) {
        const plan = await this.getPlanById(planId);
        if (!plan) throw new NotFoundError('Plan not found');

        const features = await this.getPlanFeatures(planId);

        return {
            ...plan,
            features,
        };
    }

    async getAllPlansWithFeatures() {
        const plans = await this.getAllPlans();
        const plansWithFeatures = await Promise.all(
            plans.map(async (plan) => {
                const features = await this.getPlanFeatures(plan.planId);
                return {
                    ...plan,
                    features,
                };
            })
        );

        return plansWithFeatures;
    }
}

export const adminSubscriptionService = new AdminSubscriptionService();

