import { IFlashcardStatus } from '@/models';
import { IQualityResponse } from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin';
import { z } from 'zod';
import { IItemSpacedRepetition } from '../tracking/itemSpacedRepetitionTracking.type';

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

export interface IQualityResponseNextReviewInterval {
    qualityResponse: IQualityResponse;
    nextReviewInterval: number;
}

export interface IFlashcard {
    flashcardId: number;
    topicId: number;
    nodeId?: string | null;
    front: string;
    back: string;
    createdAt: Date;
    learningState?: IFlashcardLearningState;
    
    topicName?: string;
}

export type IFlashcardLearningState = Pick<
    IItemSpacedRepetition,
    'status' | 'lastReviewed' | 'nextReview' | 'repetitionNumber' | 'easinessFactor' | 'reviewInterval'
> & { flashcardId?: number };

export type IFlashcardCreateInput = Pick<IFlashcard, 'front' | 'back'>;
export type IFlashcardUpdateInput = Pick<IFlashcard, 'flashcardId' | 'front' | 'back'>;

export type IFlashcardsBatchInput = {
  flashcardsAdded?: IFlashcardCreateInput[];
  flashcardsUpdated?: IFlashcardUpdateInput[];
  flashcardsDeleted?: number[];
};
