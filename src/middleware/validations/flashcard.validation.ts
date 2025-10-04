import { z, ZodObject } from "zod"
import validator from "../../core/validations/validator"
import { ZFlashcardsArrayAdded, ZFlashcardsBatch } from "@/types/flashcard/flashcard.type"

function validateTopicId() {
    return validator.validate<ZodObject<any, any>>({ selector: 'query', schema: z.object({ topicId: z.string() }) })
}

function validateFlashcardsAdded() {
    return validator.validate<ZodObject<any, any>>({ selector: 'body', schema: z.object({ flashcards: ZFlashcardsArrayAdded }) })
}

function validateFlashcardsBatch() {
    return validator.validate<ZodObject<any, any>>({ selector: 'body', schema: ZFlashcardsBatch });
}

export { validateTopicId, validateFlashcardsAdded, validateFlashcardsBatch };