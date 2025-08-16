import classTopicController from '@/controllers/class-based-learning/classTopic.controller';
import paramsValidator from '@/core/validations/params.validator';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import classTopicMiddleware from '@/middleware/class-based-learning/classTopic.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import topicMiddleware from '@/middleware/topic/topic.middleware';
import { Router } from 'express';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

const verifyTopicInClass = [
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicById,
    classTopicMiddleware.verifyTopicBelongsToClass,
];

router.get('/', classTopicController.getTopicsInClassForTeacher);
router.post('/', fileUploadSingleMiddleware, classTopicController.createTopicForClass);

router.put('/:topicId', ...verifyTopicInClass, fileUploadSingleMiddleware, classTopicController.updateTopicInClass);
router.delete('/:topicId', ...verifyTopicInClass, classTopicController.deleteTopicInClass);

export const teacherClassTopicRoutes = router;
