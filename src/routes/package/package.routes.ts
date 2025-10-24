import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { packageController } from '@/controllers/package/package.controller';
import {
    validateCreatePackageBody,
    validateUpdatePackageBody,
    validatePackageIdBody,
    validateGetPackagesQuery,
    validateGetPackageTopicsBody,
    validateUpdateTopicInPackageBody,
    validateRemoveTopicInPackageBody,
} from '@/middleware/validations/package/package.validation';
import { authMiddleware } from '@/middleware/auth.middleware';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes
router.use(authMiddleware);

router.get('/', validateGetPackagesQuery, packageController.getPackages);
router.post('/new', validateCreatePackageBody, packageController.createNewPackage);
router.put('/', validateUpdatePackageBody, packageController.updatePackage);
router.delete('/', validatePackageIdBody, packageController.deletePackage);

router.post('/topic-package', validateGetPackageTopicsBody, packageController.getTopicBelongPackage);
router.put('/topic/modify', validateUpdateTopicInPackageBody, packageController.updateTopicInPackage);
router.put('/topic/remove', validateRemoveTopicInPackageBody, packageController.removeTopicInPackage);

// Register the router
registerRoute('/package', router, {
    description: 'Package API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
