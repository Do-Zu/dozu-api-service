import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
import { Request, Response, Router } from "express";
import { registerRoute } from "@/routes/register.routes"; 
import flashcardController from "@/controllers/flashcard.controller";
import { validateUser } from "@/middleware/validations/validator";
import { validateFlashcardsAdded, validateTopicId } from "@/middleware/validations/flashcard.validation";

const router = Router();

globalAsyncHandler(router);

// validation example with zod
router.get('/', validateTopicId(), flashcardController.handleGetAllFlashcardsForTopic);
router.post('/', validateTopicId(), validateFlashcardsAdded(), flashcardController.handleInsertFlashcardsForTopic);

// validation example with zod
router.get('/test', validateUser(), (req, res) => {
    res.json({ message: 'Success' });
})

registerRoute('/flashcards', router, {
    description: 'Flashcards API for CRUD single flashcard',
    version: 'v1',
    isEnabled: true
})

export const flashcardRoutes = router;