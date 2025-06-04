import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import FlashcardController from '@/controllers/flashcard/flashcard.controller';
import { validateUser } from '@/middleware/validations/validator';
import {
  validateFlashcardsAdded,
  validateFlashcardsBatch,
  validateTopicId,
} from '@/middleware/validations/flashcard.validation';

const router = Router();
const flashcardController = new FlashcardController();

globalAsyncHandler(router);

router.get('/', validateTopicId(), flashcardController.handleGetAllFlashcardsForTopic);
router.post(
  '/',
  validateTopicId(),
  validateFlashcardsAdded(),
  flashcardController.handleInsertFlashcardsForTopic
);

router.post(
  '/batch',
  validateTopicId(),
  validateFlashcardsBatch(),
  flashcardController.handleBatchFlashcardsForTopic
);

router.put('/', flashcardController.handleUpdateSingleFlashcardForTopic);

router.get('/test', validateUser(), (req, res) => {
  res.json({ message: 'Success' });
});

// router.get('/test-date', getDate);
// router.put('/test-date', updateDate);
router.put('/:flashcardId/track', flashcardController.handleTrackSingleFlashcard);

router.get('/practice', flashcardController.handleGetFlashcardsPracticedForUser);
router.put('/:flashcardId/put-to-practice', flashcardController.handlePutFlashcardToPractice);

registerRoute('/flashcards', router, {
  description: 'Flashcards API for CRUD single flashcard',
  version: 'v1',
  isEnabled: true,
});

export const flashcardRoutes = router;
