import { z } from "zod"

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

export type IFlashcardAdded = z.infer<typeof ZFlashcardAdded>
export type IFlashcardUpdated = z.infer<typeof ZFlashcardUpdated>