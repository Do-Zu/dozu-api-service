import classFeedController from '@/controllers/class-based-learning/classFeed.controller';
import paramsValidator from '@/core/validations/params.validator';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', classFeedController.getFeedsInClassForTeacher);
router.post('/', classFeedController.createGeneralFeed);
router.put('/:feedId', paramsValidator.validateId('feedId'), classFeedController.updateFeed);
router.delete('/:feedId', paramsValidator.validateId('feedId'), classFeedController.deleteFeed);

export const teacherClassFeedRoutes = router;
