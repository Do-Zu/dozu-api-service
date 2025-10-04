import { Router } from 'express';
import subscriptionController from '@/controllers/subscription/subscription.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

const router = Router();

// Apply global async handler
globalAsyncHandler(router);

// Public routes
router.get('/plans', subscriptionController.getAllPlans);

// Protected routes (require authentication)
router.use(authMiddleware);

// Subscription management
router.get('/current-plan', subscriptionController.getCurrentSubscription);
router.post('/', subscriptionController.createSubscription);
router.patch('/', subscriptionController.updateSubscription);
router.post('/change', subscriptionController.changeSubscription);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/plan/features',subscriptionController.getAllFeaturesOfPlan);

// Feature usage
router.post('/feature-usage/check', subscriptionController.checkFeatureUsage);
router.post('/feature-usage/record', subscriptionController.recordFeatureUsage);
router.get('/feature-usage', subscriptionController.getFeatureUsage);

// Register the router
registerRoute('/subscription', router, {
    description: 'Subscription API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
