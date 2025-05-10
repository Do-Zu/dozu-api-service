import { flashcardsTable } from "@/models";
import { InferSelectModel } from "drizzle-orm";
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

const ZQualityResponse = z.number().int().min(0).max(5);

export const ZFlashcardTracked = z.object({
    flashcardId: z.number(),
    qualityResponse: ZQualityResponse
})

export type IFlashcardAdded = z.infer<typeof ZFlashcardAdded>
export type IFlashcardUpdated = z.infer<typeof ZFlashcardUpdated>
export type IFlashcardDeleted = z.infer<typeof ZFlashcardDeleted>

export type IFlashcardsBatch = z.infer<typeof ZFlashcardsBatch>
export type IFlashcardTracked = { flashcardId: number, qualityResponse: 0 | 1 | 2 | 3 | 4 | 5 }

export type IFlashcardProgressUpdated = {
    repetitionNumber?: number
    easinessFactor?: number | string
    reviewInterval?: number
    lastReviewed?: Date | string
    nextReview?: Date | string
    status?: string
}

export type IFlashcardFieldsReturned = {
    flashcardId?: typeof flashcardsTable.flashcardId
    topicId?: typeof flashcardsTable.topicId
    front?: typeof flashcardsTable.front
    back?: typeof flashcardsTable.back

    repetitionNumber?: typeof flashcardsTable.repetitionNumber
    easinessFactor?: typeof flashcardsTable.easinessFactor
    reviewInterval?: typeof flashcardsTable.reviewInterval
    lastReviewed?: typeof flashcardsTable.lastReviewed
    nextReview?: typeof flashcardsTable.nextReview
    status?: typeof flashcardsTable.status
}

export interface IFlashcardPracticed {
    flashcardId: number
    topicId: number
    topicName: string
    front: string
    back: string
    status: string
    nextReview: string | null

    // extra selection for calculating next time review
    reviewInterval: number
    easinessFactor: string
    repetitionNumber: number
}
