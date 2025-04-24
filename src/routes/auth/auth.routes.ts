import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import {
  loginController,
  registerUserController,
  testingAuthPath,
  verifyEmailController,
} from '@/controllers/auth.controller';
import { sendVerificationLinkEmail } from '@/libs/nodeMailerTransporter.lib';
import { authMiddleware } from '@/middleware/auth.middleware';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

router.get('/testing', authMiddleware, testingAuthPath);

router.post('/register', registerUserController);
router.post('/login', loginController);
router.get('/verify-email', verifyEmailController);

registerRoute('/auth', router, {
  description: 'Authentication endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
