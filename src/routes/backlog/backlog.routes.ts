import { Router } from 'express';
import { backlogController } from '@/controllers/backlog/backlog.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '@/routes/register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import {
    validateBacklogAdd,
    validateBacklogReserve,
    validateBacklogCommit,
    validateBacklogRelease,
    validateBacklogCount,
    validateBacklogClear,
} from '@/middleware/validations/backlog.validation';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);

router.get('/count', validateBacklogCount(), backlogController.handleCount);
router.post('/add', validateBacklogAdd(), backlogController.handleAdd);
router.post('/reserve', validateBacklogReserve(), backlogController.handleReserve);
router.post('/commit', validateBacklogCommit(), backlogController.handleCommit);
router.post('/release', validateBacklogRelease(), backlogController.handleRelease);
router.delete('/clear', validateBacklogClear(), backlogController.handleClear);

registerRoute('/backlog', router, {
    description: 'Flashcard backlog operations (server-backed)',
    version: 'v1',
    isEnabled: true,
});

export const backlogRoutes = router;
