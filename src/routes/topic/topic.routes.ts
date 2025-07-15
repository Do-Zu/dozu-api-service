import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import topicController from '@/controllers/topic/topic.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import subscriptionMiddleware from '@/middleware/subscription/subscript.middleware';
import { validateIdParam } from '@/middleware/validations/params.validation';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/:topicId', validateIdParam('topicId'), topicController.getTopicById);
router.get('/', topicController.getTopicsForUser);
router.post('/', subscriptionMiddleware.handleSubscription, topicController.createTopicForUser);
router.put('/:topicId', validateIdParam('topicId'), topicController.updateTopicById);
router.delete('/:topicId', validateIdParam('topicId'), topicController.deleteTopicById);
router.post('/:topicId/flashcards/start-learning', validateIdParam('topicId'), topicController.startLearningFlashcards);

registerRoute('/topics', router, {
    description: 'Topics API for CRUD topics',
    version: 'v1',
    isEnabled: true,
});

export default router;
