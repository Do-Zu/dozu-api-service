import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import { authMiddleware, validateStudent, validateTeacher } from '@/middleware/auth.middleware';
import paramsValidator from '@/core/validations/params.validator';
import classTopicMiddleware from '@/middleware/class-based-learning/classTopic.middleware';
import topicMiddleware from '@/middleware/topic/topic.middleware';
import { studentClassRoutes } from './student/studentClass.routes';
import { teacherClassRoutes } from './teacher/teacherClass.routes';
import classTopicCommentRoutes from './classTopicComment.routes';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';

const router = Router();
globalAsyncHandler(router);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyUserCanAccessClass];

const verifyTopicInClass = [
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicById,
    classTopicMiddleware.verifyTopicBelongsToClass,
];

router.use(authMiddleware);

router.use('/student', validateStudent, studentClassRoutes);
router.use('/teacher', validateTeacher, teacherClassRoutes);

router.use('/:classId/topics/:topicId/comments', ...verifyClassAccess, ...verifyTopicInClass, classTopicCommentRoutes);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;
