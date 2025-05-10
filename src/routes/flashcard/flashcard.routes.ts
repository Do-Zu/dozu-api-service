import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
import { Request, Response, Router } from "express";
import { registerRoute } from "@/routes/register.routes"; 
import flashcardController, { getDate, updateDate } from "@/controllers/flashcard/flashcard.controller";
import { validateUser } from "@/middleware/validations/validator";
import { validateFlashcardsAdded, validateFlashcardsBatch, validateTopicId } from "@/middleware/validations/flashcard.validation";
import flashcardRepo from "@/repositories/flashcard.repo";
import logger from "@/utils/logger";

const router = Router();

globalAsyncHandler(router);

router.get('/', validateTopicId(), flashcardController.handleGetAllFlashcardsForTopic);
router.post('/', validateTopicId(), validateFlashcardsAdded(), flashcardController.handleInsertFlashcardsForTopic);

router.post('/batch', validateTopicId(), validateFlashcardsBatch(), flashcardController.handleBatchFlashcardsForTopic);

router.put('/', flashcardController.handleUpdateSingleFlashcardForTopic);

router.get('/test', validateUser(), (req, res) => {
    res.json({ message: 'Success' });
})

router.get('/test-date', getDate);
router.put('/test-date', updateDate);
router.put('/:flashcardId/track', flashcardController.handleTrackSingleFlashcard);

router.get('/practice', flashcardController.handleGetFlashcardsPracticed);
router.put('/:flashcardId/put-to-practice', flashcardController.handlePutFlashcardToPractice);

router.put('/test-update', async(req, res, next) => {
    const flashcard = { flashcardId: 22, front: 'Pen', back: 'Cây bút' };
    try {
        const flashcardUpdated = await flashcardRepo.handleUpdateSingleFlashcardForTopic(flashcard);
        logger.info(flashcardUpdated);
    } catch(err) {
        next(err);
    }
})

registerRoute('/flashcards', router, {
    description: 'Flashcards API for CRUD single flashcard',
    version: 'v1',
    isEnabled: true
})

export const flashcardRoutes = router;