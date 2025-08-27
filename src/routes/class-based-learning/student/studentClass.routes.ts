import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import classController from '@/controllers/class-based-learning/class.controller';
import classTopicController from '@/controllers/class-based-learning/classTopic.controller';
import paramsValidator from '@/core/validations/params.validator';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';
import classTopicCommentRoutes from '../classTopicComment.routes';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', classController.getClassesForStudent);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyStudentInClass];

router.get('/:classId', ...verifyClassAccess, classController.getClassById);
router.get('/:classId/topics', ...verifyClassAccess, classTopicController.getTopicsInClassForStudent);

router.use('/:classId/topics/:topicId/comments', ...verifyClassAccess, classTopicCommentRoutes);

export const studentClassRoutes = router;
