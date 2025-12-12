import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { NextFunction, Request, Response, Router } from 'express';
import assignmentController from '../../../features/assignment/assignment.controller';
import paramsValidator from '@/core/validations/params.validator';
import { isTeacher } from '@/utils/auth/authHelpers.utils';
import { Forbidden } from '@/core/error';
import { assignmentCommentRoutes } from './assignmentComment.routes';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

async function requireTeacher(req: Request, res: Response, next: NextFunction) {
    const teacher = await isTeacher(req);
    if (!teacher) {
        const message = 'Teacher role required for this action.';
        throw new Forbidden(message);
    } else {
        next();
    }
}

router.get('/', assignmentController.getAssignmentsForClass);
router.post('/', requireTeacher, assignmentController.createAssignment);
router.get('/:assignmentId', paramsValidator.validateId('assignmentId'), assignmentController.getAssignmentById);
router.put(
    '/:assignmentId',
    requireTeacher,
    paramsValidator.validateId('assignmentId'),
    assignmentController.updateAssignmentById
);
router.delete(
    '/:assignmentId',
    requireTeacher,
    paramsValidator.validateId('assignmentId'),
    assignmentController.deleteAssignmentById
);

// Assignment comments routes
router.use('/:assignmentId/comments', paramsValidator.validateId('assignmentId'), assignmentCommentRoutes);

export const assignmentRoutes = router;
