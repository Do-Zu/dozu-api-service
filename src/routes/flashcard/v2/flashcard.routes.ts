import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware';
import flashcardController from '@/controllers/flashcard/v2/flashcard.controller';

const router = Router({ mergeParams: true }); // for using req.params.topicId in /topics/:topicId/flashcards

globalAsyncHandler(router);
router.use(authMiddleware);

router.post('/', flashcardController.createFlashcardsForTopic);
router.patch('/', flashcardController.updateFlashcardsInTopic);
router.delete('/', flashcardController.deleteFlashcardsInTopic);
router.get('/learning', flashcardController.getDueAnkiCardsForTopic);

export const flashcardRoutes = router;
