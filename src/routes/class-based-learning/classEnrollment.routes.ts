import classEnrollmentController from '@/controllers/class-based-learning/classEnrollment.controller';
import { authMiddleware, validateTeacher } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import paramsValidator from '@/core/validations/params.validator';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.post('/', classEnrollmentController.joinClass);
router.delete('/:classId', paramsValidator.validateId('classId'), classEnrollmentController.leaveClass);
router.get(
    '/:classId/students',
    paramsValidator.validateId('classId'),
    validateTeacher,
    classEnrollmentController.getStudentsInClass
);
router.delete(
    '/:classId/students/:studentId',
    paramsValidator.validateId('classId'),
    validateTeacher,
    classEnrollmentController.removeStudentFromClass
);

registerRoute('/enrollments', router, {
    description: 'Classes API for managing class enrollments',
    version: 'v1',
    isEnabled: true,
});

export const classEnrollmentRoutes = router;
