import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminRevenueController } from '@/controllers/admin/revenue.controller';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// Revenue statistics routes
router.get('/stats', adminRevenueController.getRevenueStats.bind(adminRevenueController));
router.get('/breakdown', adminRevenueController.getRevenueBreakdown.bind(adminRevenueController));
router.get('/top-customers', adminRevenueController.getTopCustomers.bind(adminRevenueController));

registerRoute('/admin/revenue', router, {
    description: 'Admin Revenue Analytics API',
    version: 'v1',
    isEnabled: true,
});

export const adminRevenueRoutes = router;

