import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import topicController from '@/controllers/topic/topic.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import subscriptionMiddleware from '@/middleware/subscription/subscript.middleware';
import paramsValidator from '@/core/validations/params.validator';
import { flashcardRoutes } from '../flashcard/flashcard.routes';
import topicMiddleware from '@/middleware/topic/topic.middleware';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/:topicId', paramsValidator.validateId('topicId'), topicController.getTopicById);
router.get('/', topicController.getTopicsForUser);
router.post(
    '/',
    fileUploadSingleMiddleware,
    subscriptionMiddleware.handleSubscription,
    topicController.createTopicForUser
);
router.put(
    '/:topicId',
    fileUploadSingleMiddleware,
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicById,
    topicController.updateTopicById
);
router.delete(
    '/:topicId',
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicById,
    topicController.deleteTopicById
);

router.use(
    '/:topicId/flashcards',
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicById,
    topicMiddleware.verifyUserCanAccessTopic,
    flashcardRoutes
);

registerRoute('/topics', router, {
    description: 'Topics API for CRUD topics',
    version: 'v1',
    isEnabled: true,
});

export default router;
