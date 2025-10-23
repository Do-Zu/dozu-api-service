import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { packageController } from '@/controllers/package/package.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes
router.use(authMiddleware);

router.get('/', packageController.getPackages);
router.post('/new', packageController.createNewPackage);
router.put('/', packageController.updatePackage);
router.delete('/', packageController.deletePackage);

router.post('/topic-package', packageController.getTopicBelongPackage);
router.put('/topic/modify', packageController.updateTopicInPackage);
router.put('/topic/remove', packageController.removeTopicInPackage);

// Register the router
registerRoute('/package', router, {
    description: 'Package API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
