import { z } from 'zod';
import { IItemSpacedRepetition } from '../tracking/itemSpacedRepetitionTracking.type';
import { IItemStatus } from '@/models';
import { IAnkiRating, INextReviewInterval } from '@/services/spaced-repetition-system/super-memo-2/anki.service';

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

export interface IFlashcard {
    flashcardId: number;
    topicId: number;
    nodeId?: string | null;
    front: string;
    back: string;
    imageUrl?: string | null;
    isStar?: boolean;
    createdAt: Date;
    learningState?: IFlashcardLearningState;

    topicName?: string;
}

export type IFlashcardLearningState = Pick<
    IItemSpacedRepetition,
    'status' | 'lastReviewed' | 'nextReview' | 'repetitionNumber' | 'easinessFactor' | 'reviewInterval' | 'step'
> & { flashcardId?: number };

export type IFlashcardCreateInput = Pick<IFlashcard, 'front' | 'back'> & { image?: IImageSaveInput | null };
export type IFlashcardUpdateInput = Pick<IFlashcard, 'flashcardId' | 'front' | 'back'> & {
    image?: IImageSaveInput | null;
};

export type IFlashcardsBatchInput = {
    flashcardsAdded?: IFlashcardCreateInput[];
    flashcardsUpdated?: IFlashcardUpdateInput[];
    flashcardsDeleted?: number[];
};

export type IFlashcardBatchResult = {
    flashcardsAdded: IFlashcard[];
    flashcardsUpdated: IFlashcard[];
};

export interface IUnspashImageSaveInput {
    type: 'unsplash';
    data: {
        id: string;
        url: string;
        downloadLocation: string;
    };
}

export interface IUploadImageSaveInput {
    type: 'upload';
    data: string;
}

export type IImageSaveInput = IUnspashImageSaveInput | IUploadImageSaveInput;

export type IDueAnkiCard = Pick<IFlashcard, 'flashcardId' | 'front' | 'back' | 'imageUrl' | 'topicName' | 'nodeId'> & {
    learningState: IFlashcardLearningState;
    nextReview: string;
    status: IItemStatus;
};

export type IAnkiCardReviewed = Pick<IFlashcard, 'flashcardId'> & {
    learningState: IFlashcardLearningState;
    nextReview: string;
    nextReviewInterval: INextReviewInterval;
    status: IItemStatus;
    rating: IAnkiRating;
};

export type InsertFlashcardsBody = (Pick<IFlashcard, 'front' | 'back' | 'nodeId'> & {
    image?: IImageSaveInput | null;
})[];

export type IUpdateFlashcard = Pick<IFlashcard, 'flashcardId' | 'front' | 'back' | 'nodeId' | 'imageUrl'>;

export type IUpdateFlashcardsBody = (Pick<IFlashcard, 'flashcardId' | 'front' | 'back' | 'nodeId'> & {
    image?: IImageSaveInput | null;
})[];
