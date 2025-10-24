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
import learningMaterialRoutes from '@/routes/class-based-learning/learning-material/learningMaterial.routes';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';

const router = Router();
globalAsyncHandler(router);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyUserCanAccessClass];

const testingVerifyClassIdParams = [paramsValidator.validateId('classId')]//! FOR TESTING, USE verifyClassAccess WHEN DONE

const verifyTopicInClass = [
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicByIdInParam,
    classTopicMiddleware.verifyTopicBelongsToClass,
];

router.use(authMiddleware);//!DISABLED FOR TESTING, DO NOT COMMIT, UNCOMMENT LATER

router.use('/student', validateStudent, studentClassRoutes);
router.use('/teacher', validateTeacher, teacherClassRoutes);

router.use('/:classId/topics/:topicId/comments', ...verifyClassAccess, ...verifyTopicInClass, classTopicCommentRoutes);
router.use('/:classId/learning-material',...testingVerifyClassIdParams, learningMaterialRoutes);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;
