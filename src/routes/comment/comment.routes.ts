import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import commentController from '@/controllers/comment/comment.controller';
import paramsValidator from '@/core/validations/params.validator';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

// Get comment by ID
router.get('/:commentId', paramsValidator.validateId('commentId'), commentController.getCommentById);

// Update comment
router.put('/:commentId', paramsValidator.validateId('commentId'), commentController.updateComment);

// Delete comment
router.delete('/:commentId', paramsValidator.validateId('commentId'), commentController.deleteComment);

registerRoute('/comments', router, {
    description: 'Comments API for managing comments',
    version: 'v1',
    isEnabled: true,
});

export const commentRoutes = router;

