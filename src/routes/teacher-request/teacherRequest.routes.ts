import teacherRequestController from '@/controllers/teacher-request/teacherRequest.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import { validateIdParam } from '@/middleware/validations/params.validation';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/', teacherRequestController.getRequest);
router.post('/', teacherRequestController.sendRequest);
router.get('/all', teacherRequestController.getAllRequests);
router.get('/pending', teacherRequestController.getPendingRequests);
router.patch('/:requestId/approve', validateIdParam('requestId'), teacherRequestController.approveRequest);
router.patch('/:requestId/reject', validateIdParam('requestId'), teacherRequestController.rejectRequest);

registerRoute('/teacher-requests', router, {
    description: 'Teacher Requests API endpoints',
    version: 'v1',
    isEnabled: true,
});
