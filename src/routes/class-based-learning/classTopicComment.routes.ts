import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import validator from '@/core/validations/validator';
import {
    createCommentSchema,
    getCommentsQuerySchema,
} from '@/middleware/validations/class/comment/classTopicComment.validator';

import { classTopicCommentController } from '@/controllers/class-based-learning/classTopicComment.controller';

const router = Router({ mergeParams: true });

globalAsyncHandler(router);

router.post(
    '/node-comments',
    validator.validate({ selector: 'body', schema: getCommentsQuerySchema }),
    classTopicCommentController.getCommentsByNode
);

// router.post(
//     '/search',
//     validator.validate({ selector: 'body', schema: getCommentsQuerySchema }),
//     classTopicCommentController.getCommentsByFilters
// );

router.post(
    '/add',
    validator.validate({ selector: 'body', schema: createCommentSchema }),
    classTopicCommentController.createComment
);

router.post('/single-comment', classTopicCommentController.getCommentById);

// PUT /api/classes/:classId/topics/:topicId/comments/:commentId - Update comment
// router.put(
//     '/:commentId',
//     paramsValidator.validateId('commentId'),
//     validator.validate({ selector: 'body', schema: updateCommentSchema }),
//     classTopicCommentController.updateComment
// );

// router.delete('/:commentId', paramsValidator.validateId('commentId'), classTopicCommentController.deleteComment);

router.post(
    '/replies',
    validator.validate({ selector: 'body', schema: getCommentsQuerySchema }),
    classTopicCommentController.getRepliesByComment
);

// router.post(
//     '/:commentId/reactions',
//     paramsValidator.validateId('commentId'),
//     validator.validate({ selector: 'body', schema: addReactionSchema }),
//     classTopicCommentController.addReaction
// );

// router.delete(
//     '/:commentId/reactions',
//     paramsValidator.validateId('commentId'),
//     classTopicCommentController.removeReaction
// );

export default router;
