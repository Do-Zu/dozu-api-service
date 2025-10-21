import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import assignmentController from '../../../../features/assignment/assignment.controller';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/', assignmentController.getAssignmentsForClass);

export const teacherClassAssignmentRoutes = router;
