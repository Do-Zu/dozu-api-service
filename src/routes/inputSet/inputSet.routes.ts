import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { inputSetController } from '@/controllers/inputSet.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import topicMiddleware from '@/middleware/topic/topic.middleware';
import paramsValidator from '@/core/validations/params.validator';

const router = express.Router();

globalAsyncHandler(router);

router.use(authMiddleware);

router.get(
    '/document/:topicId',
    paramsValidator.validateId('topicId'),
    inputSetController.getInputSetDocumentController
);

router.post('/resources', topicMiddleware.verifyTopicById, inputSetController.insertResource);

registerRoute('/input-set', router, {
    description: 'Authentication endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
