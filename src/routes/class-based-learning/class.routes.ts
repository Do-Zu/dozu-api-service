import { authMiddleware, validateTeacher } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import classController from '@/controllers/class-based-learning/class.controller';
import { registerRoute } from '../register.routes';
import topicController from '@/controllers/topic/topic.controller';
import classEnrollmentController from '@/controllers/class-based-learning/classEnrollment.controller';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';

const router = Router();

globalAsyncHandler(router);

// todo-ka: add middleware for verifying teacher
router.use(authMiddleware);

router.get('/', classController.getClassesForUser);
router.post('/', validateTeacher, classController.createClassForUser);
router.put('/:classId', validateTeacher, classController.updateClassById);

router.get(
    '/:classId/topics/student',
    classMiddleware.verifyStudentInClass,
    topicController.getTopicsInClassForStudent
);

router.get(
    '/:classId/topics/teacher',
    validateTeacher,
    classMiddleware.verifyTeacherOwnsClass,
    topicController.getTopicsInClassForTeacher
);

router.post('/:classId/topic', validateTeacher, topicController.createTopicForClass);

router.get('/:classId', classMiddleware.verifyUserCanAccessClass.bind(classMiddleware), classController.getClassById);

router.post('/enrollments', classEnrollmentController.joinClass);
router.delete('/enrollments/:classId', classEnrollmentController.leaveClass);

router.get('/enrollments/:classId/students', validateTeacher, classController.getStudentsInClass);
router.delete('/enrollments/:classId/students/:studentId', validateTeacher, classEnrollmentController.removeStudentFromClass);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;
