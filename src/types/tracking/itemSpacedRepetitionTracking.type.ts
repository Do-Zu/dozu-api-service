import { IFlashcardStatus, IItemType } from "@/models";

export interface IItemSpacedRepetition {
    itemId: number;
    userId: number;
    topicId: number;
    type: IItemType;
    createdAt: Date;
    repetitionNumber: number;
    easinessFactor: string;
    reviewInterval: number;
    lastReviewed: string | null;
    nextReview: string;
    status: IFlashcardStatus;
}

export type ICreateTrackingRecord = Pick<IItemSpacedRepetition, 'userId' | 'topicId' | 'itemId' | 'type'>;