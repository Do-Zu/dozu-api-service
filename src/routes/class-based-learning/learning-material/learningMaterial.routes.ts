import express from 'express';
import { registerRoute } from '../../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

import { createLearningMaterialController } from '@/controllers/class-based-learning/learning-material/learningMaterial.controller';

const router = express.Router();

globalAsyncHandler(router);

// router.use(authMiddleware);

// router.get(
//     '/document/:topicId',
//     paramsValidator.validateId('topicId'),
//     inputSetController.getInputSetDocumentController
// );

router.post(
    '/',
    // topicMiddleware.verifyTopicByIdInBody,
    // topicMiddleware.verifyUserCanAccessTopic,
    createLearningMaterialController
);

registerRoute('/learning-material', router, {
    description: 'Learning material endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
