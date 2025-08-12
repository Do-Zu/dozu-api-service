import classController from '@/controllers/class-based-learning/class.controller';
import paramsValidator from '@/core/validations/params.validator';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';
import { Router } from 'express';
import { teacherClassTopicRoutes } from './teacherClassTopic.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', classController.getClassesForTeacher);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyTeacherOwnsClass];

router.post('/', classController.createClassForTeacher);

router.get('/:classId', ...verifyClassAccess, classController.getClassById);
router.put('/:classId', ...verifyClassAccess, classController.updateClassById);
router.use('/:classId/topics', ...verifyClassAccess, teacherClassTopicRoutes);

export const teacherClassRoutes = router;
