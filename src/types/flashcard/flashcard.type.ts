import { IFlashcardStatus } from '@/models';
import { IQualityResponse } from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin';
import { z } from 'zod';

export const ZFlashcardAdded = z.object({
    front: z.string(),
    back: z.string(),
});

export const ZFlashcardsArrayAdded = z.array(ZFlashcardAdded);

export const ZFlashcardUpdated = z.object({
    flashcardId: z.number(),
    front: z.string(),
    back: z.string(),
});

export const ZFlashcardsArrayUpdated = z.array(ZFlashcardUpdated);

export const ZFlashcardDeleted = z.number();
export const ZFlashcardsArrayDeleted = z.array(ZFlashcardDeleted);

export const ZFlashcardsBatch = z.object({
    flashcardsAdded: ZFlashcardsArrayAdded.optional(),
    flashcardsUpdated: ZFlashcardsArrayUpdated.optional(),
    flashcardsDeleted: ZFlashcardsArrayDeleted.optional(),
});

const ZQualityResponse = z.number().int().min(0).max(5);

export const ZFlashcardTracked = z.object({
    flashcardId: z.number(),
    qualityResponse: ZQualityResponse,
});

export type IFlashcardAdded = z.infer<typeof ZFlashcardAdded>;
export type IFlashcardUpdated = z.infer<typeof ZFlashcardUpdated>;
export type IFlashcardDeleted = z.infer<typeof ZFlashcardDeleted>;

export type IFlashcardsBatch = z.infer<typeof ZFlashcardsBatch>;

export interface IQualityResponseNextReviewInterval {
    qualityResponse: IQualityResponse;
    nextReviewInterval: number;
}

export interface IFlashcardBasic {
    flashcardId: number;
    topicId: number;
    front: string;
    back: string;
}

export interface IFlashcardSpacedRepetition {
    flashcardId: number;
    repetitionNumber: number;
    easinessFactor: string;
    reviewInterval: number;
    lastReviewed: string | null;
    nextReview: string;
    status: IFlashcardStatus;
}

export interface IFlashcardFull extends IFlashcardBasic, IFlashcardSpacedRepetition {
    topicName: string;
}
