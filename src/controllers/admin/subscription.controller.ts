import { Request, Response } from 'express';
import { adminSubscriptionService } from '@/services/admin/subscription.service';
import { adminSubscriptionStatsService } from '@/services/admin/subscriptionStats.service';
import { SuccessResponse } from '@/core/success';
import {
    createPlanSchema,
    updatePlanSchema,
    togglePlanActiveSchema,
    createFeatureSchema,
    updateFeatureSchema,
    assignFeatureToPlanSchema,
    updatePlanFeatureSchema,
    bulkUpdatePlanFeaturesSchema,
} from '@/dtos/admin/subscription.dto';

class AdminSubscriptionController {
    // ============ STATISTICS & MONITORING ============

    async getSubscriptionStats(_req: Request, res: Response) {
        const stats = await adminSubscriptionStatsService.getSubscriptionStats();
        SuccessResponse.ok(res, stats, 'Subscription statistics retrieved successfully');
    }

    async getAllSubscriptions(req: Request, res: Response) {
        const result = await adminSubscriptionStatsService.getAllSubscriptions(req.query);
        SuccessResponse.ok(res, result, 'Subscriptions retrieved successfully');
    }

    async getSubscriptionById(req: Request, res: Response) {
        const subscriptionId = parseInt(req.params.id);
        const subscription = await adminSubscriptionStatsService.getSubscriptionById(subscriptionId);
        SuccessResponse.ok(res, subscription, 'Subscription retrieved successfully');
    }

    async getUserSubscriptionHistory(req: Request, res: Response) {
        const userId = parseInt(req.params.userId);
        const history = await adminSubscriptionStatsService.getUserSubscriptionHistory(userId);
        SuccessResponse.ok(res, history, 'User subscription history retrieved successfully');
    }

    // ============ PLAN MANAGEMENT ============

    async getAllPlans(_req: Request, res: Response) {
        const plans = await adminSubscriptionService.getAllPlansWithFeatures();
        SuccessResponse.ok(res, plans, 'Plans retrieved successfully');
    }

    async getPlanById(req: Request, res: Response) {
        const planId = parseInt(req.params.id);
        const plan = await adminSubscriptionService.getPlanWithFeatures(planId);
        SuccessResponse.ok(res, plan, 'Plan retrieved successfully');
    }

    async createPlan(req: Request, res: Response) {
        const validatedData = createPlanSchema.parse(req.body);
        const plan = await adminSubscriptionService.createPlan(validatedData);
        SuccessResponse.created(res, plan, 'Plan created successfully');
    }

    async updatePlan(req: Request, res: Response) {
        const planId = parseInt(req.params.id);
        const validatedData = updatePlanSchema.parse(req.body);
        const plan = await adminSubscriptionService.updatePlan(planId, validatedData);
        SuccessResponse.ok(res, plan, 'Plan updated successfully');
    }

    async togglePlanActive(req: Request, res: Response) {
        const planId = parseInt(req.params.id);
        const { isActive } = togglePlanActiveSchema.parse(req.body);
        const plan = await adminSubscriptionService.togglePlanActive(planId, isActive);
        SuccessResponse.ok(res, plan, `Plan ${isActive ? 'activated' : 'deactivated'} successfully`);
    }

    async deletePlan(req: Request, res: Response) {
        const planId = parseInt(req.params.id);
        await adminSubscriptionService.deletePlan(planId);
        SuccessResponse.ok(res, null, 'Plan deleted successfully');
    }

    // ============ FEATURE MANAGEMENT ============

    async getAllFeatures(_req: Request, res: Response) {
        const features = await adminSubscriptionService.getAllFeatures();
        SuccessResponse.ok(res, features, 'Features retrieved successfully');
    }

    async getFeatureById(req: Request, res: Response) {
        const featureId = parseInt(req.params.id);
        const feature = await adminSubscriptionService.getFeatureById(featureId);
        SuccessResponse.ok(res, feature, 'Feature retrieved successfully');
    }

    async createFeature(req: Request, res: Response) {
        const validatedData = createFeatureSchema.parse(req.body);
        const feature = await adminSubscriptionService.createFeature(validatedData);
        SuccessResponse.created(res, feature, 'Feature created successfully');
    }

    async updateFeature(req: Request, res: Response) {
        const featureId = parseInt(req.params.id);
        const validatedData = updateFeatureSchema.parse(req.body);
        const feature = await adminSubscriptionService.updateFeature(featureId, validatedData);
        SuccessResponse.ok(res, feature, 'Feature updated successfully');
    }

    async deleteFeature(req: Request, res: Response) {
        const featureId = parseInt(req.params.id);
        await adminSubscriptionService.deleteFeature(featureId);
        SuccessResponse.ok(res, null, 'Feature deleted successfully');
    }

    // ============ PLAN-FEATURE MAPPING ============

    async getPlanFeatures(req: Request, res: Response) {
        const planId = parseInt(req.params.planId);
        const features = await adminSubscriptionService.getPlanFeatures(planId);
        SuccessResponse.ok(res, features, 'Plan features retrieved successfully');
    }

    async assignFeatureToPlan(req: Request, res: Response) {
        const validatedData = assignFeatureToPlanSchema.parse(req.body);
        const planFeature = await adminSubscriptionService.assignFeatureToPlan(validatedData);
        SuccessResponse.created(res, planFeature, 'Feature assigned to plan successfully');
    }

    async updatePlanFeature(req: Request, res: Response) {
        const planFeatureId = parseInt(req.params.planFeatureId);
        const validatedData = updatePlanFeatureSchema.parse(req.body);
        const planFeature = await adminSubscriptionService.updatePlanFeature(planFeatureId, validatedData);
        SuccessResponse.ok(res, planFeature, 'Plan feature updated successfully');
    }

    async removeFeatureFromPlan(req: Request, res: Response) {
        const planFeatureId = parseInt(req.params.planFeatureId);
        await adminSubscriptionService.removeFeatureFromPlan(planFeatureId);
        SuccessResponse.ok(res, null, 'Feature removed from plan successfully');
    }

    async bulkUpdatePlanFeatures(req: Request, res: Response) {
        const validatedData = bulkUpdatePlanFeaturesSchema.parse(req.body);
        const features = await adminSubscriptionService.bulkUpdatePlanFeatures(validatedData);
        SuccessResponse.ok(res, features, 'Plan features updated successfully');
    }
}

export const adminSubscriptionController = new AdminSubscriptionController();

