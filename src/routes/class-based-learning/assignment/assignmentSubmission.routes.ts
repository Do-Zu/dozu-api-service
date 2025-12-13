import paramsValidator from '@/core/validations/params.validator';
import assignmentSubmissionController from '@/features/assignment-submission/assignmentSubmission.controller';
import commentController from '@/controllers/comment/comment.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { Router } from 'express';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);
router.use(authMiddleware);

// update to /:assignmentId
router.get('/', paramsValidator.validateId('assignmentId'), assignmentSubmissionController.getAssignmentSubmission);
router.post('/', paramsValidator.validateId('assignmentId'), assignmentSubmissionController.createAssignmentSubmission);
router.put(
    '/:submissionId',
    paramsValidator.validateId('assignmentId'),
    paramsValidator.validateId('submissionId'),
    assignmentSubmissionController.updateAssignmentSubmissionById
);

router.get(
    '/all',
    paramsValidator.validateId('assignmentId'),
    assignmentSubmissionController.getAssignmentSubmissionsOfStudents
);

router.put(
    '/:submissionId/grade',
    paramsValidator.validateId('assignmentId'),
    paramsValidator.validateId('submissionId'),
    assignmentSubmissionController.gradeAssignmentSubmission
);

// Submission comments routes (private comments)
router.get(
    '/:submissionId/comments',
    paramsValidator.validateId('assignmentId'),
    paramsValidator.validateId('submissionId'),
    commentController.getCommentsBySubmissionId
);
router.post(
    '/:submissionId/comments',
    paramsValidator.validateId('assignmentId'),
    paramsValidator.validateId('submissionId'),
    commentController.createCommentForSubmission
);

registerRoute('/assignments/:assignmentId/submissions', router);

export const assignmentSubmissionRoutes = router;
