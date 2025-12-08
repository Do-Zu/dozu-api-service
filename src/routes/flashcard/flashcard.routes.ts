import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import flashcardController from '@/controllers/flashcard/flashcard.controller';
import { validateFlashcardsBatch } from '@/middleware/validations/flashcard.validation';
import { authMiddleware } from '@/middleware/auth.middleware';
import paramsValidator from '@/core/validations/params.validator';

const router = Router({ mergeParams: true }); // for using req.params.topicId in /topics/:topicId/flashcards

globalAsyncHandler(router);
router.use(authMiddleware);

router.get('/', flashcardController.getFlashcardsForTopic);
router.post('/batch/changes', validateFlashcardsBatch(), flashcardController.batchFlashcardsForTopicChanges);
router.post('/batch/node', validateFlashcardsBatch(), flashcardController.handleBatchFlashcardsForNode); //for use with mindmap's node
router.patch(
    '/:flashcardId/review',
    paramsValidator.validateId('flashcardId'),
    flashcardController.reviewFlashcardByAnki
);
router.patch('/:flashcardId/toggle-star', paramsValidator.validateId('flashcardId'), flashcardController.toggleStar);
router.post('/search-images', flashcardController.searchFlashcardImages);

registerRoute('/flashcards', router, {
    description: 'Flashcards API for CRUD single flashcard',
    version: 'v1',
    isEnabled: true,
});

export const flashcardRoutes = router;
