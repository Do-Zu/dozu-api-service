import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware } from '@/middleware/auth.middleware';
import { adminUserController } from '@/controllers/admin/user.controller';
import { adminAuthController } from '@/controllers/admin/auth.controller';
import { validateGetUsersQuery, validateUpdateUserRole } from '@/middleware/validations/admin/user.validation';

const router = Router();
globalAsyncHandler(router);
// router.use(authMiddleware);

router.get('/', validateGetUsersQuery(), adminUserController.handleGetAllUsers);
router.patch('/:id/toggle-active',adminUserController.handleToggleUserActive);
router.patch('/:id/role', validateUpdateUserRole(), adminUserController.handleUpdateUserRole);
router.get('/:id/auth-accounts', adminAuthController.handleGetUserAuthAccounts);
router.get('/user-stats', adminUserController.handleGetUserStats);

registerRoute('/admin/users', router, {
  description: 'Admin API',
  version: 'v1',
  isEnabled: true,
});

export const adminUserRoutes = router;
