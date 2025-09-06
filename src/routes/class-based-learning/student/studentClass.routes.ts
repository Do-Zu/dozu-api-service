import classController from '@/controllers/class-based-learning/class.controller';
import classTopicController from '@/controllers/class-based-learning/classTopic.controller';
import paramsValidator from '@/core/validations/params.validator';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { studentClassFeedRoutes } from './studentClassFeed.routes';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', classController.getClassesForStudent);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyStudentInClass];

router.get('/:classId', ...verifyClassAccess, classController.getClassById);
router.get('/:classId/topics', ...verifyClassAccess, classTopicController.getTopicsInClassForStudent);
router.use('/:classId/feeds', ...verifyClassAccess, studentClassFeedRoutes);

export const studentClassRoutes = router;
