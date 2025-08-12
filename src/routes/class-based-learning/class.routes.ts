import { authMiddleware, validateStudent, validateTeacher } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import { studentClassRoutes } from './student/studentClass.routes';
import { teacherClassRoutes } from './teacher/teacherClass.routes';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.use('/student', validateStudent, studentClassRoutes);
router.use('/teacher', validateTeacher, teacherClassRoutes);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;
