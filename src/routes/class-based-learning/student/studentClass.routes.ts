import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import classController from '@/controllers/class-based-learning/class.controller';
import classTopicController from '@/controllers/class-based-learning/classTopic.controller';
import paramsValidator from '@/core/validations/params.validator';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';
import { studentClassFeedRoutes } from './studentClassFeed.routes';
import { studentClassInviteRoutes } from './studentClassInvite.routes';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', classController.getClassesForStudent);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyStudentInClass.bind(classMiddleware)];

router.get('/:classId', ...verifyClassAccess, classController.getClassById);
router.get('/:classId/topics', ...verifyClassAccess, classTopicController.getTopicsInClassForStudent);
router.use('/:classId/feeds', ...verifyClassAccess, studentClassFeedRoutes);
router.use('/invites', studentClassInviteRoutes);

export const studentClassRoutes = router;
