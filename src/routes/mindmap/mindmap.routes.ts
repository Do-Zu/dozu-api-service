import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import { saveMindmapController } from '@/controllers/mindmap/mindmap.controller';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

// router.get('/testing', authMiddleware, testingAuthPath);
router.get('/profile', authMiddleware, saveMindmapController);


registerRoute('/mindmap', router, {
  description: 'Mindmap endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
