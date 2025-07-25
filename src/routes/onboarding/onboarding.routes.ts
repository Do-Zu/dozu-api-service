import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { onboardingController } from '@/controllers/onboarding/onboarding.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes - onboarding result requires authentication
router.post('/onboarding-result', authMiddleware, onboardingController.storeOnboardingResult);

// Register the router
registerRoute('/onboarding', router, {
    description: 'Onboarding API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
