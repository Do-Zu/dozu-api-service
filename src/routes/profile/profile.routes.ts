import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import { profileController } from '@/controllers/profile/profile.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
// import { uploadMiddleware } from '@/middleware/upload.middleware';

const router = Router();
globalAsyncHandler(router);

// Apply authentication middleware to all profile routes
router.use(authMiddleware);

// Profile CRUD operations
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.delete('/', profileController.deleteAccount);

// Avatar management - TODO: Implement with Cloudinary
// router.post('/avatar', uploadMiddleware.single('avatar'), ProfileController.uploadAvatar);
// router.delete('/avatar', ProfileController.removeAvatar);

// Password management
router.put('/password', profileController.changePassword);

// Settings management
router.put('/notifications', profileController.updateNotificationSettings);
router.put('/privacy', profileController.updatePrivacySettings);


registerRoute('/profile', router, {
  description: 'User Profile API endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
