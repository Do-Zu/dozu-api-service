import { z, ZodObject } from "zod"
import validateData from "./validator"
import { ZFlashcardsArrayAdded, ZFlashcardsBatch } from "@/types/flashcard/flashcard.type"

function validateTopicId() {
    return validateData<ZodObject<any, any>>({ selector: req => req.query, schema: z.object({ topicId: z.string() }) })
}

function validateFlashcardsAdded() {
    return validateData<ZodObject<any, any>>({ selector: req => req.body, schema: z.object({ flashcards: ZFlashcardsArrayAdded }) })
}

function validateFlashcardsBatch() {
    return validateData<ZodObject<any, any>>({ selector: req => req.body, schema: ZFlashcardsBatch });
}

export { validateTopicId, validateFlashcardsAdded, validateFlashcardsBatch };