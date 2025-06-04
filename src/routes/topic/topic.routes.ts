import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import TopicController from '@/controllers/topic/topic.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

const topicController = new TopicController();

router.use(authMiddleware);

router.get('/:topicId', topicController.handleGetSingleTopic);
router.get('/', topicController.handleGetAllTopicsForUser);
router.post('/', topicController.handleInsertSingleTopicForUser);
router.put('/:topicId', topicController.handleUpdateSingleTopic);
router.delete('/:topicId', topicController.handleDeleteSingleTopicForUser);

registerRoute('/topics', router, {
  description: 'Topics API for CRUD topics',
  version: 'v1',
  isEnabled: true,
});

export default router;
