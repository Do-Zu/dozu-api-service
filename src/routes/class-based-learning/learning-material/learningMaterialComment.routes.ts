import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import commentController from '@/controllers/comment/comment.controller';
import paramsValidator from '@/core/validations/params.validator';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

// Get comments for a learning material
router.get('/', paramsValidator.validateId('learningMaterialId'), commentController.getCommentsByLearningMaterialId);

// Create comment for a learning material
router.post('/', paramsValidator.validateId('learningMaterialId'), commentController.createCommentForLearningMaterial);

export const learningMaterialCommentRoutes = router;

