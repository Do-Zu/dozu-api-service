import express from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { getClassworkInClassController } from '@/controllers/class-based-learning/classwork.controller';

const router = express.Router();

globalAsyncHandler(router);



// router.get(
//     '/document/:topicId',
//     paramsValidator.validateId('topicId'),
//     inputSetController.getInputSetDocumentController
// );

router.get(
    '/',
    // topicMiddleware.verifyTopicByIdInBody,
    // topicMiddleware.verifyUserCanAccessTopic,
    getClassworkInClassController
);



export default router;
