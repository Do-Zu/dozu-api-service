import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import {
  changePasswordController,
  getProfileController,
  googleOAuthRedirectController,
  loginController,
  logoutController,
  refreshTokenController,
  registerUserController,
  sendChangePasswordLinkController,
  testingAuthPath,
  verifyEmailController,
} from '@/controllers/auth.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

router.get('/testing', authMiddleware, testingAuthPath);

router.post('/register', registerUserController);
router.post('/login', loginController);
router.post('/logout', logoutController);
router.post('/refresh-token',refreshTokenController)
router.post('/verify-email', verifyEmailController);
router.get('/profile', authMiddleware, getProfileController);
router.post('/google', googleOAuthRedirectController);
router.post('/send-change-password-link',sendChangePasswordLinkController)
router.post('/change-password',changePasswordController)
//todo - Duy: missing forget password flow: /forget-password to begin, /reset-password to go through with new password
//todo - Duy: consider resend verification flow or remove verification flow

registerRoute('/auth', router, {
  description: 'Authentication endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
