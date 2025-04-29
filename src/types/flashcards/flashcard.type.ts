import { z } from "zod"

export interface IFlashcardReturned {
    topicId: number,
    flashcardId: number,
    front: string,
    back: string
}

export const ZFlashcardAdded = z.object({
    front: z.string(),
    back: z.string()
}) 

export const ZFlashcardsArrayAdded = z.array(ZFlashcardAdded);

export const ZFlashcardUpdated = z.object({
    flashcardId: z.number(),
    front: z.string(),
    back: z.string()
})

export const ZFlashcardsArrayUpdated = z.array(ZFlashcardUpdated);

export const ZFlashcardDeleted = z.number();
export const ZFlashcardsArrayDeleted = z.array(ZFlashcardDeleted);

export const ZFlashcardsBatch = z.object({
    flashcardsAdded: ZFlashcardsArrayAdded.optional(),
    flashcardsUpdated: ZFlashcardsArrayUpdated.optional(),
    flashcardsDeleted: ZFlashcardsArrayDeleted.optional()
})

export type IFlashcardAdded = z.infer<typeof ZFlashcardAdded>
export type IFlashcardUpdated = z.infer<typeof ZFlashcardUpdated>
export type IFlashcardDeleted = z.infer<typeof ZFlashcardDeleted>

export type IFlashcardsBatch = z.infer<typeof ZFlashcardsBatch>