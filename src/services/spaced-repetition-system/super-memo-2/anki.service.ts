import { IFlashcardStatus } from '@/models';
import { getSystemDate, TimeUnit } from '@/utils/date';
import { addDays, addMinutes } from 'date-fns';

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

// these below constants could be customized by users (but it is not supported in this current version)

// 1. New Cards
// steps to get through in learning state before moving to review state
// time-unit: MINUTE
const learningSteps = [1, 10];

// if user press 'GOOD' in the final step (in learning state) => moving to review state & set initial interval = graduatingInterval
// time-unit: DAY
const graduatingInterval = 1;

// if user presses 'EASY' in learning state => moving to review state & set initial interval = easyInterval
// time-unit: DAY
const easyInterval = 4;

// 2. Lapses (Forget Cards)
// steps to get through in relearning state before moving to review state
// time-unit: MINUTE
const relearningSteps = [10];

// 3. Advanced
// initial ease for a review-state Card
const startingEase = 2.5;

// if user presses 'EASY', Interval Factor = Interval Factor * easyBonus
const easyBonus = 1.3;

// this is customized by user, final Interval Factor = Interval Factor * intervalModifier
const intervalModifier = 1;

// if user presses 'HARD', Interval Factor = Interval Factor * hardInterval
const hardInterval = 1.2;

// if user presses 'AGAIN', Interval Factor = Interval Factor * newInterval
const newInterval = 0.0;

// cards should be shown early if they have a delay of less than learnAheadLimit minutes and there’s nothing else to do
export const learnAheadLimit = 20;

// only for FLASHCARD
export interface IAnkiCard {
    flashcardId: number;
    status: IFlashcardStatus;
    step: number | null; // should start at 0
    easinessFactor: string;
    lastReviewed: Date | null;
    reviewInterval: number;
}

export interface IAnkiResult extends IAnkiCard {
    nextReview: Date;
    nextReviewInterval: INextReviewInterval;
}

export interface INextReviewInterval {
    interval: number;
    timeUnit: TimeUnit;
}

export interface INextReviewIntervalForRating {
    rating: IAnkiRating;
    interval: INextReviewInterval;
}

const invalidRatingMessage = 'Invalid rating option';
const invalidCardStatusMessage = 'Invalid card status';
const nullCardStepMessage = 'Card step is NULL';

class AnkiService {
    public schedule(card: IAnkiCard, rating: IAnkiRating): IAnkiResult {
        // copy card object, update lastReviewed
        card = { ...card, lastReviewed: getSystemDate() };
        if (card.lastReviewed === null) {
            throw new Error('lastReviewed is NULL');
        }
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;

        if (card.status === IAnkiStatus.NEW) {
            card.status = IAnkiStatus.LEARNING;
        }

        if (card.status === IAnkiStatus.LEARNING) {
            if (learningSteps.length === 0 || (card.step && card.step >= learningSteps.length)) {
                // todo: xem check card.step >= or > learningSteps.length
                card.status = IAnkiStatus.REVIEW;
                card.step = null;
                card.easinessFactor = startingEase.toFixed(3);
                card.reviewInterval = graduatingInterval;
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else {
                if (rating === IAnkiRating.AGAIN) {
                    card.step = 0; // return to the first step
                    nextReview = addMinutes(card.lastReviewed, learningSteps[card.step]);
                    nextReviewInterval = {
                        interval: learningSteps[card.step],
                        timeUnit: TimeUnit.MINUTE,
                    };
                } else if (rating === IAnkiRating.HARD) {
                    // (todo: xem lại cách xử lý)
                    // remain the same step

                    if (card.step === null) {
                        throw new Error(nullCardStepMessage);
                    }
                    let nextInterval: number;

                    if (card.step === 0 && learningSteps.length === 1) {
                        nextInterval = learningSteps[card.step] * 1.5;
                    } else if (card.step === 0 && learningSteps.length >= 2) {
                        nextInterval = (learningSteps[card.step] + learningSteps[card.step + 1]) / 2;
                    } else {
                        nextInterval = learningSteps[card.step];
                    }

                    nextReview = addMinutes(card.lastReviewed, nextInterval);
                    nextReviewInterval = {
                        interval: nextInterval,
                        timeUnit: TimeUnit.MINUTE,
                    };
                } else if (rating === IAnkiRating.GOOD) {
                    // the last step => moving to review state
                    if (card.step === null) {
                        throw new Error(nullCardStepMessage);
                    }
                    if (card.step + 1 === learningSteps.length) {
                        card.status = IAnkiStatus.REVIEW;
                        card.step = null;
                        card.easinessFactor = startingEase.toFixed(3);
                        card.reviewInterval = graduatingInterval;
                        nextReview = addDays(card.lastReviewed, card.reviewInterval);
                        nextReviewInterval = {
                            interval: card.reviewInterval,
                            timeUnit: TimeUnit.DAY,
                        };
                    } else {
                        card.step += 1;
                        nextReview = addMinutes(card.lastReviewed, learningSteps[card.step]);
                        nextReviewInterval = {
                            interval: learningSteps[card.step],
                            timeUnit: TimeUnit.MINUTE,
                        };
                    }
                } else if (rating === IAnkiRating.EASY) {
                    card.status = IAnkiStatus.REVIEW;
                    card.step = null;
                    card.easinessFactor = startingEase.toFixed(3);
                    card.reviewInterval = easyInterval;
                    nextReview = addDays(card.lastReviewed, card.reviewInterval);
                    nextReviewInterval = {
                        interval: card.reviewInterval,
                        timeUnit: TimeUnit.DAY,
                    };
                } else {
                    throw new Error(invalidRatingMessage);
                }
            }
        } else if (card.status === IAnkiStatus.REVIEW) {
            if (rating === IAnkiRating.AGAIN) {
                // todo: apply minimum interval

                // calculate ease and interval

                // reduce ease by 20%
                card.easinessFactor = Math.max(1.3, parseFloat(card.easinessFactor) * 0.8).toFixed(3);
                card.reviewInterval = Math.round(card.reviewInterval * newInterval * intervalModifier);

                // todo: apply fuzz interval
                if (relearningSteps.length > 0) {
                    card.status = IAnkiStatus.RELEARNING;
                    card.step = 0;
                    nextReview = addMinutes(card.lastReviewed, learningSteps[card.step]);
                    nextReviewInterval = {
                        interval: learningSteps[card.step],
                        timeUnit: TimeUnit.MINUTE,
                    };
                } else {
                    nextReview = addDays(card.lastReviewed, card.reviewInterval);
                    nextReviewInterval = {
                        interval: card.reviewInterval,
                        timeUnit: TimeUnit.DAY,
                    };
                }
            } else if (rating === IAnkiRating.HARD) {
                // calculate ease and interval
                card.easinessFactor = Math.max(1.3, parseFloat(card.easinessFactor) * 0.85).toFixed(3);
                card.reviewInterval = Math.round(card.reviewInterval * hardInterval * intervalModifier);

                // todo: apply fuzz interval
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else if (rating === IAnkiRating.GOOD) {
                // ease stays the same

                // todo: apply days_overdue (situation when user review card later but still remember it)

                card.reviewInterval = Math.round(
                    card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier
                );

                // todo: apply fuzz interval
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else if (rating === IAnkiRating.EASY) {
                // todo: apply days_overdue
                card.reviewInterval = Math.round(
                    card.reviewInterval * parseFloat(card.easinessFactor) * easyBonus * intervalModifier
                );

                // increase ease by 15%
                card.easinessFactor = (parseFloat(card.easinessFactor) * 1.15).toFixed(3);

                // todo: apply fuzz interval
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else {
                throw new Error(invalidRatingMessage);
            }
        } else if (card.status === IAnkiStatus.RELEARNING) {
            // the only difference between this status and LEARNING status
            // is that after finishing RELEARNING phase, it will enter REVIEW status with previous data (including easinessFactor and reviewInterval)
            // rather than assigning some starting constants to easinessFactor & reviewInterval

            if (learningSteps.length === 0 || (card.step && card.step >= learningSteps.length)) {
                // todo: xem check card.step >= or > learningSteps.length
                card.status = IAnkiStatus.REVIEW;
                card.step = null;
                // do not update ease
                card.reviewInterval = graduatingInterval;
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else {
                if (rating === IAnkiRating.AGAIN) {
                    card.step = 0;
                    nextReview = addMinutes(card.lastReviewed, learningSteps[card.step]);
                    nextReviewInterval = {
                        interval: learningSteps[card.step],
                        timeUnit: TimeUnit.MINUTE,
                    };
                } else if (rating === IAnkiRating.HARD) {
                    // (todo: xem lại cách xử lý)
                    // remain the same step

                    if (card.step === null) {
                        throw new Error(nullCardStepMessage);
                    }

                    let nextInterval: number;

                    if (card.step === 0 && learningSteps.length === 1) {
                        nextInterval = learningSteps[card.step] * 1.5;
                    } else if (card.step === 0 && learningSteps.length >= 2) {
                        nextInterval = (learningSteps[card.step] + learningSteps[card.step + 1]) / 2;
                    } else {
                        nextInterval = learningSteps[card.step];
                    }

                    nextReview = addMinutes(card.lastReviewed, nextInterval);
                    nextReviewInterval = {
                        interval: nextInterval,
                        timeUnit: TimeUnit.MINUTE,
                    };
                } else if (rating === IAnkiRating.GOOD) {
                    if (card.step === null) {
                        throw new Error(nullCardStepMessage);
                    }
                    if (card.step + 1 === learningSteps.length) {
                        card.status = IAnkiStatus.REVIEW;
                        card.step = null;
                        // do not update ease
                        // updating reviewInterval same as updating reviewInterval in REVIEW state for GOOD rating
                        card.reviewInterval = Math.round(
                            card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier
                        );
                        nextReview = addDays(card.lastReviewed, card.reviewInterval);
                        nextReviewInterval = {
                            interval: card.reviewInterval,
                            timeUnit: TimeUnit.DAY,
                        };
                    } else {
                        card.step += 1;
                        nextReview = addMinutes(card.lastReviewed, learningSteps[card.step]);
                        nextReviewInterval = {
                            interval: learningSteps[card.step],
                            timeUnit: TimeUnit.MINUTE,
                        };
                    }
                } else if (rating === IAnkiRating.EASY) {
                    card.status = IAnkiStatus.REVIEW;
                    card.step = null;
                    // do not update ease
                    // updating reviewInterval same as updating reviewInterval in REVIEW state for EASY rating
                    card.reviewInterval = Math.round(
                        card.reviewInterval * parseFloat(card.easinessFactor) * easyBonus * intervalModifier
                    );
                    nextReview = addDays(card.lastReviewed, card.reviewInterval);
                    nextReviewInterval = {
                        interval: card.reviewInterval,
                        timeUnit: TimeUnit.DAY,
                    };
                } else {
                    throw new Error(invalidRatingMessage);
                }
            }
        } else {
            throw new Error(invalidCardStatusMessage);
        }

        return { ...card, nextReview, nextReviewInterval };
    }
}

// todo: check phases (Learning / Review / Relearning) có khác gì với status (New, Learning, Review) (DONE)

export default new AnkiService();
