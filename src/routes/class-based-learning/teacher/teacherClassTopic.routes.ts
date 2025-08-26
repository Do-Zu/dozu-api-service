import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import classTopicController from '@/controllers/class-based-learning/classTopic.controller';
import paramsValidator from '@/core/validations/params.validator';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import classTopicMiddleware from '@/middleware/class-based-learning/classTopic.middleware';
import topicMiddleware from '@/middleware/topic/topic.middleware';
import { classTopicCommentRoutes } from '../classTopicComment.routes';

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

router.use('/:topicId/comments', ...verifyTopicInClass, classTopicCommentRoutes);

export const teacherClassTopicRoutes = router;
