import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import { authMiddleware, validateStudent, validateTeacher } from '@/middleware/auth.middleware';
import paramsValidator from '@/core/validations/params.validator';
import { studentClassRoutes } from './student/studentClass.routes';
import { teacherClassRoutes } from './teacher/teacherClass.routes';
import classTopicCommentRoutes from './classTopicComment.routes';
import learningMaterialRoutes from '@/routes/class-based-learning/learning-material/learningMaterial.routes';
import classworkRoutes from '@/routes/class-based-learning/classwork.routes';

import classMiddleware from '@/middleware/class-based-learning/class.middleware';
import { assignmentRoutes } from './assignment/assignment.routes';

const router = Router();
globalAsyncHandler(router);

const verifyClassAccess = [paramsValidator.validateId('classId'), classMiddleware.verifyUserCanAccessClass];

router.use(authMiddleware);

router.use('/student', validateStudent, studentClassRoutes);
router.use('/teacher', validateTeacher, teacherClassRoutes);

router.use('/:classId/topics/comments', ...verifyClassAccess, classTopicCommentRoutes);
router.use('/:classId/learning-material', ...verifyClassAccess, learningMaterialRoutes);
router.use('/:classId/classwork', ...verifyClassAccess, classworkRoutes);

// for assignment feature
router.use('/:classId/assignments', ...verifyClassAccess, assignmentRoutes);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;
