import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminSubscriptionController } from '@/controllers/admin/subscription.controller';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// ============ STATISTICS & MONITORING ROUTES ============
router.get('/stats', adminSubscriptionController.getSubscriptionStats.bind(adminSubscriptionController));
router.get('/subscriptions', adminSubscriptionController.getAllSubscriptions.bind(adminSubscriptionController));
router.get('/subscriptions/:id', adminSubscriptionController.getSubscriptionById.bind(adminSubscriptionController));
router.get('/users/:userId/subscription-history', adminSubscriptionController.getUserSubscriptionHistory.bind(adminSubscriptionController));

// ============ PLAN ROUTES ============
router.get('/plans', adminSubscriptionController.getAllPlans.bind(adminSubscriptionController));
router.get('/plans/:id', adminSubscriptionController.getPlanById.bind(adminSubscriptionController));
router.post('/plans', adminSubscriptionController.createPlan.bind(adminSubscriptionController));
router.patch('/plans/:id', adminSubscriptionController.updatePlan.bind(adminSubscriptionController));
router.patch('/plans/:id/toggle-active', adminSubscriptionController.togglePlanActive.bind(adminSubscriptionController));
router.delete('/plans/:id', adminSubscriptionController.deletePlan.bind(adminSubscriptionController));

// ============ FEATURE ROUTES ============
router.get('/features', adminSubscriptionController.getAllFeatures.bind(adminSubscriptionController));
router.get('/features/:id', adminSubscriptionController.getFeatureById.bind(adminSubscriptionController));
router.post('/features', adminSubscriptionController.createFeature.bind(adminSubscriptionController));
router.patch('/features/:id', adminSubscriptionController.updateFeature.bind(adminSubscriptionController));
router.delete('/features/:id', adminSubscriptionController.deleteFeature.bind(adminSubscriptionController));

// ============ PLAN-FEATURE MAPPING ROUTES ============
router.get('/plans/:planId/features', adminSubscriptionController.getPlanFeatures.bind(adminSubscriptionController));
router.post('/plan-features', adminSubscriptionController.assignFeatureToPlan.bind(adminSubscriptionController));
router.patch('/plan-features/:planFeatureId', adminSubscriptionController.updatePlanFeature.bind(adminSubscriptionController));
router.delete('/plan-features/:planFeatureId', adminSubscriptionController.removeFeatureFromPlan.bind(adminSubscriptionController));
router.put('/plans/features/bulk', adminSubscriptionController.bulkUpdatePlanFeatures.bind(adminSubscriptionController));

registerRoute('/admin/subscription', router, {
    description: 'Admin Subscription Management API',
    version: 'v1',
    isEnabled: true,
});

export const adminSubscriptionRoutes = router;

