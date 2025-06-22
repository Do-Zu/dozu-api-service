import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Register the router
registerRoute('/recommendation', router, {
    description: 'Recommendation API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
