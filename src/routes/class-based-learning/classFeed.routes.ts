import { authMiddleware, validateStudent, validateTeacher } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import paramsValidator from '@/core/validations/params.validator';
import classFeedController from '@/controllers/class-based-learning/classFeed.controller';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

// teacher
router.get(
    '/teacher/:classId',
    validateTeacher,
    paramsValidator.validateId('classId'),
    classFeedController.getFeedsInClassForTeacher
);
router.post('/teacher/:classId', validateTeacher, paramsValidator.validateId('classId'), classFeedController.createGeneralFeed);
router.put('/teacher/:feedId')

// student
router.get('/student/:classId', validateStudent, paramsValidator.validateId('classId'), classFeedController.getFeedsInClass);

registerRoute('/class_feeds', router, {
    description: 'Class API for managing feeds',
    version: 'v1',
    isEnabled: true,
});

export const classFeedRoutes = router;
