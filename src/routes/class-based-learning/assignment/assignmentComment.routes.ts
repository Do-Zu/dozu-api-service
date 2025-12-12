import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import commentController from '@/controllers/comment/comment.controller';
import paramsValidator from '@/core/validations/params.validator';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

// Get comments for an assignment
router.get('/', paramsValidator.validateId('assignmentId'), commentController.getCommentsByAssignmentId);

// Create comment for an assignment
router.post('/', paramsValidator.validateId('assignmentId'), commentController.createCommentForAssignment);

export const assignmentCommentRoutes = router;

