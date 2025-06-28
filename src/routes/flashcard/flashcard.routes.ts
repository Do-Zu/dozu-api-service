import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import FlashcardController from '@/controllers/flashcard/flashcard.controller';
import { validateFlashcardsBatch, validateTopicId } from '@/middleware/validations/flashcard.validation';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
const flashcardController = new FlashcardController();

globalAsyncHandler(router);

router.use(authMiddleware);
router.get('/', validateTopicId(), flashcardController.handleGetAllFlashcardsForTopic);

router.post('/batch', validateTopicId(), validateFlashcardsBatch(), flashcardController.handleBatchFlashcardsForTopic);

router.put('/:flashcardId/track', flashcardController.handleTrackSingleFlashcard);

// todo: đổi url
router.get('/learning', flashcardController.handleGetFlashcardsLearningForUser);
router.get('/learning/:topicId', flashcardController.handleGetFlashcardsLearningForTopic);
router.put('/:flashcardId/put-to-learning', flashcardController.handlePutFlashcardToLearning);

registerRoute('/flashcards', router, {
    description: 'Flashcards API for CRUD single flashcard',
    version: 'v1',
    isEnabled: true,
});

export const flashcardRoutes = router;
