import { z, ZodObject } from "zod"
import validateData from "./validator"
import { ZFlashcardsArrayAdded } from "@/types/flashcards/flashcard.type"

function validateTopicId() {
    return validateData<ZodObject<any, any>>({ selector: req => req.query, schema: z.object({ topicId: z.string() }) })
}

function validateFlashcardsAdded() {
    return validateData<ZodObject<any, any>>({ selector: req => req.body, schema: z.object({ flashcards: ZFlashcardsArrayAdded }) })
}

export { validateTopicId, validateFlashcardsAdded };