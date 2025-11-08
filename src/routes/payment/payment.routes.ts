import { paymentController } from '@/controllers/payment/payment.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import express from 'express';
import { registerRoute } from '../register.routes';

const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

//
router.use(authMiddleware);

// Define routes
router.post('/register', paymentController.createLinkPaymentWithPayOS);
router.post('/status/transaction', paymentController.updateTransactionStatus);
// router.post('/register/sepay', paymentController.createLinkPaymentWithSepay);

// Register the router
registerRoute('/payment', router, {
    description: 'Payment API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
