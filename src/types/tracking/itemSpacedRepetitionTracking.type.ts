import { IFlashcardStatus, IItemType, TypeInsertSpacedRepetitionTracking } from '@/models';

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
    step: number | null;
}

export type ICreateTrackingRecord = Pick<
    TypeInsertSpacedRepetitionTracking,
    'userId' | 'topicId' | 'itemId' | 'type' | 'nextReview'
>;
