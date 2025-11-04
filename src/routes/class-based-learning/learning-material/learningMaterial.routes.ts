import express from 'express';
import { registerRoute } from '../../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

import {
    createLearningMaterialController,
    deleteLearningMaterialController,
    getLearningMaterialController,
    getLearningMaterialsOfClassController,
} from '@/controllers/class-based-learning/learning-material/learningMaterial.controller';

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

router.get(
    '/',
    // topicMiddleware.verifyTopicByIdInBody,
    // topicMiddleware.verifyUserCanAccessTopic,
    getLearningMaterialsOfClassController
);

router.get(
    '/:learningMaterialId',
    // topicMiddleware.verifyTopicByIdInBody,
    // topicMiddleware.verifyUserCanAccessTopic,
    getLearningMaterialController
);

router.delete('/:learningMaterialId', deleteLearningMaterialController);

registerRoute('/learning-material', router, {
    description: 'Learning material endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
