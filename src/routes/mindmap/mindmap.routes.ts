import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import {
  addFlashcardsToNodeController,
  getAllChildrenOfANodeController,
  getAllNodesOfMindmapController,
  getFlashcardsOfNodeController,
  getSingularNodeController,
  getTopicMindmapController,
  saveTopicMindmapController,
} from '@/controllers/mindmap/mindmap.controller';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)
router.use(authMiddleware);

router.post('/:topicId', saveTopicMindmapController);

router.get('/:topicId', getTopicMindmapController);
router.get('/:topicId/nodes', getAllNodesOfMindmapController);
router.get('/:topicId/nodes/:nodeId/children', getAllChildrenOfANodeController);
router.get('/:topicId/nodes/:nodeId',getSingularNodeController);
router.get('/nodes/:nodeId',getFlashcardsOfNodeController);
router.put('/:topicId/nodes/:nodeId', addFlashcardsToNodeController);

registerRoute('/mindmap', router, {
  description: 'Mindmap endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
