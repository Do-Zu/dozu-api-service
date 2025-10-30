import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminPaymentController } from '@/controllers/admin/payment.controller';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);


router.get('/export/csv', adminPaymentController.exportPaymentsCsv.bind(adminPaymentController));
router.get('/stats', adminPaymentController.getPaymentStats.bind(adminPaymentController));
router.get('/transactions', adminPaymentController.getAllPayments.bind(adminPaymentController));
router.post('/transactions/refund', adminPaymentController.refundTransaction.bind(adminPaymentController));
router.get('/transactions/:id', adminPaymentController.getPaymentById.bind(adminPaymentController));
router.patch('/transactions/:id/status', adminPaymentController.updateTransactionStatus.bind(adminPaymentController));

registerRoute('/admin/payments', router, {
    description: 'Admin Payment Tracking API',
    version: 'v1',
    isEnabled: true,
});

export const adminPaymentRoutes = router;


