import { authMiddleware } from '@/middleware/auth.middleware';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import noteController from '../../features/note/note.controller';
import paramsValidator from '@/core/validations/params.validator';

const router = Router({ mergeParams: true }); // for using req.params.topicId in /topics/:topicId/notes

globalAsyncHandler(router);
router.use(authMiddleware);

router.get('/', noteController.getNoteForTopic);
router.patch('/:noteId', paramsValidator.validateId('noteId'), noteController.updateNoteById);

export const noteRoutes = router;