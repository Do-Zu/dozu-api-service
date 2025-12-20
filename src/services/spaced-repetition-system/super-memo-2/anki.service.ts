import { IFlashcardStatus } from '@/models';
import { TimeUnit } from '@/utils/date';
import AnkiScheduler from './anki/domain/anki-scheduler';

export enum IAnkiRating {
    AGAIN = 1,
    HARD = 2,
    GOOD = 3,
    EASY = 4,
}

export enum IAnkiStatus {
    NEW = 'new',
    LEARNING = 'learning',
    REVIEW = 'review',
    RELEARNING = 'relearning',
}

// cards should be shown early if they have a delay of less than learnAheadLimit minutes and there’s nothing else to do
export const learnAheadLimit = 20;

// only for FLASHCARD
export interface IAnkiCard {
    flashcardId: number;
    status: IFlashcardStatus;
    step: number | null; // should start at 0
    easinessFactor: string;
    lastReviewed: Date | null;
    nextReview: Date;
    reviewInterval: number;
}

export type IBaseIntervalWithDeviation = {
    baseInterval: number;
    deviation: number;
};

export interface IAnkiResult extends IAnkiCard {
    nextReview: Date;
    nextReviewInterval: INextReviewInterval;
    baseIntervalWithDeviation: IBaseIntervalWithDeviation | null;
}

export interface INextReviewInterval {
    interval: number;
    timeUnit: TimeUnit;
}

export type IAnkiCardStatusCounts = Record<Exclude<IAnkiStatus, IAnkiStatus.RELEARNING>, number>;

/**
 * Public API layer for Anki scheduling logic
 */
class AnkiService {
    /**
     *
     * @param scheduler Concrete implementation of AnkiScheduler
     */
    constructor(private readonly scheduler: AnkiScheduler) {}

    public schedule(card: IAnkiCard, rating: IAnkiRating): IAnkiResult {
        return this.scheduler.schedule(card, rating);
    }
}

export default AnkiService;
