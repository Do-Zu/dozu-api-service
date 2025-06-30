import { Router } from 'express';
import { SubscriptionController } from '@/controllers/subscription/subscription.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

const router = Router();
const subscriptionController = new SubscriptionController();

// Apply global async handler
globalAsyncHandler(router);

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Protected routes (require authentication)
router.use(authMiddleware);

// Subscription management
router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/', subscriptionController.createSubscription);
router.patch('/', subscriptionController.updateSubscription);

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
