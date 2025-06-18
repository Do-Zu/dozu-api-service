import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import {
  getTopicMindmapController,
  saveTopicMindmapController,
} from '@/controllers/mindmap/mindmap.controller';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

router.post('/:topicId', authMiddleware, saveTopicMindmapController);
router.get('/:topicId', authMiddleware, getTopicMindmapController);

registerRoute('/mindmap', router, {
  description: 'Mindmap endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
