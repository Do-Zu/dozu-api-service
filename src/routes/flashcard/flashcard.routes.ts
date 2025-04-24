import { handleDeleteFlashcardController, handleGetFlashcardController, handleInsertExampleTopic, handleInsertExampleUser, handleInsertFlashcardController, handleUpdateFlashcardController } from "@/controllers/flashcard.controller";
import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
import { Router } from "express";
import { registerRoute } from "@/routes/register.routes"; 

const router = Router();

globalAsyncHandler(router);

router.get('/', handleGetFlashcardController);

router.post('/', handleInsertFlashcardController);
router.post('/example/user', handleInsertExampleUser);
router.post('/example/topic', handleInsertExampleTopic);

router.put('/', handleUpdateFlashcardController);
router.delete('/', handleDeleteFlashcardController);

registerRoute('/flashcards', router, {
    description: 'Flashcards API for CRUD single flashcard',
    version: 'v1',
    isEnabled: true
})

export const flashcardRoutes = router;