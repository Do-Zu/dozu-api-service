import classFeedController from '@/controllers/class-based-learning/classFeed.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

router.get('/', classFeedController.getFeedsInClass);

export const studentClassFeedRoutes = router;