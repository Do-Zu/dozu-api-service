import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
import { Router } from "express";
import { registerRoute } from "../register.routes";
import { handleDeleteAllFlashcardsController, handleDeleteOneFlashcardController, handleGetAllFlashcardsController, handleInsertManyFlashcardsController, handleUpdateManyFlashcardsController, handleUpdateOneFlashcardController } from "@/controllers/topic.controller";

const router = Router();

globalAsyncHandler(router);

// đẩy qua flashcards router nếu ko cần topicId
router.get('/:topicId/flashcards', handleGetAllFlashcardsController);
router.patch('/:topicId/flashcards/:flashcardId', handleUpdateOneFlashcardController);
router.delete('/:topicId/flashcards/:flashcardId', handleDeleteOneFlashcardController);

router.post('/:topicId/flashcards', handleInsertManyFlashcardsController);
router.patch('/:topicId/flashcards', handleUpdateManyFlashcardsController);
router.delete('/:topicId/flashcards', handleDeleteAllFlashcardsController);

registerRoute('/topics', router, {
    description: 'Topic API for CRUD new Topic and Flashcard in a topic',
    version: 'v1',
    isEnabled: true
})

export const topicRoutes = router;
