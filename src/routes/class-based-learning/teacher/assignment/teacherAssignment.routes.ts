import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import assignmentController from '../../../../features/assignment/assignment.controller';
import paramsValidator from '@/core/validations/params.validator';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', assignmentController.getAssignmentsForClass);
router.post('/', assignmentController.createAssignment);
router.get('/:assignmentId', paramsValidator.validateId('assignmentId'), assignmentController.getAssignmentById);
router.put('/:assignmentId', paramsValidator.validateId('assignmentId'), assignmentController.updateAssignmentById);
router.delete('/:assignmentId', paramsValidator.validateId('assignmentId'), assignmentController.deleteAssignmentById);

export const teacherAssignmentRoutes = router;
