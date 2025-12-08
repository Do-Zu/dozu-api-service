import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import noteController from '../../features/note/note.controller';

const router = Router({ mergeParams: true }); // for using req.params.topicId in /topics/:topicId/notes

globalAsyncHandler(router);
router.use(authMiddleware);

router.get('/', noteController.getNoteForTopic);

export const noteRoutes = router;