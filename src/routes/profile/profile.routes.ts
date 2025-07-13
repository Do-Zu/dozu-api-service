import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import { ProfileController } from '@/controllers/profile/profile.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { uploadMiddleware } from '@/middleware/upload.middleware';

const router = Router();
globalAsyncHandler(router);

// Apply authentication middleware to all profile routes
router.use(authMiddleware);

// Profile CRUD operations
router.get('/', ProfileController.getProfile);
router.put('/', ProfileController.updateProfile);
router.delete('/', ProfileController.deleteAccount);

// Avatar management
router.post('/avatar', uploadMiddleware.single('avatar'), ProfileController.uploadAvatar);
router.delete('/avatar', ProfileController.removeAvatar);

// Password management
router.put('/password', ProfileController.changePassword);

// Settings management
router.put('/notifications', ProfileController.updateNotificationSettings);
router.put('/privacy', ProfileController.updatePrivacySettings);
router.put('/settings', ProfileController.updateSettings);

// Activity and achievements
router.get('/activity', ProfileController.getActivityStats);
router.get('/achievements', ProfileController.getAchievements);

registerRoute('/profile', router, {
  description: 'User Profile API endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
