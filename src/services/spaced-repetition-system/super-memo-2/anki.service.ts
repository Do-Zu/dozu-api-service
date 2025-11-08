import { IFlashcardStatus } from '@/models';
import { IAnkiSetting } from '@/types/anki-setting/ankiSetting.type';
import { getSystemDate, TimeUnit } from '@/utils/date';
import { addDays, addMinutes, differenceInHours } from 'date-fns';

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

// these constants below could be customized by users (but it is not supported in this current version)

// // 1. New Cards
// // steps to get through in learning state before moving to review state
// // time-unit: MINUTE
// const learningSteps = [1, 10];

// // if user press 'GOOD' in the final step (in learning state) => moving to review state & set initial interval = graduatingInterval
// // time-unit: DAY
// const graduatingInterval = 1;

// // if user presses 'EASY' in learning state => moving to review state & set initial interval = easyInterval
// // time-unit: DAY
// const easyInterval = 4;

// // 2. Lapses (Forget Cards)
// // steps to get through in relearning state before moving to review state
// // time-unit: MINUTE
// const relearningSteps = [10];

// // 3. Advanced
// // initial ease for a review-state Card
// const startingEase = 2.5;

// // if user presses 'EASY', Interval Factor = Interval Factor * easyBonus
// const easyBonus = 1.3;

// // this is customized by user, final Interval Factor = Interval Factor * intervalModifier
// const intervalModifier = 1;

// // if user presses 'HARD', Interval Factor = Interval Factor * hardInterval
// const hardInterval = 1.2;

// // if user presses 'AGAIN', Interval Factor = Interval Factor * newInterval
// const newInterval = 0.0;

// // time-unit: DAY
// const minimumInterval = 1;

// // time-unit: DAY
// const maximumInterval = 36500;

// cards should be shown early if they have a delay of less than learnAheadLimit minutes and there’s nothing else to do
export const learnAheadLimit = 20;

const FUZZ_RANGES = [
    {
        start: 2.5,
        end: 7,
        factor: 0.15,
    },
    {
        start: 7,
        end: 20,
        factor: 0.1,
    },
    {
        start: 20,
        end: Infinity,
        factor: 0.05,
    },
];

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

type IPrivateAnkiCard = Omit<IAnkiCard, 'lastReviewed'> & {
    lastReviewed: Date;
};

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

const invalidRatingMessage = 'Invalid rating option';
const invalidCardStatusMessage = 'Invalid card status';
const nullCardStepMessage = 'Card step is NULL';

class AnkiService {
    public ankiSetting: IAnkiSetting;
    public constructor(ankiSetting: IAnkiSetting) {
        this.ankiSetting = ankiSetting;
    }

    public schedule(card: IAnkiCard, rating: IAnkiRating): IAnkiResult {
        // copy card object, update lastReviewed
        card = { ...card, lastReviewed: getSystemDate() };
        if (card.lastReviewed === null) {
            throw new Error('lastReviewed is NULL');
        }

        if (card.status === IAnkiStatus.NEW) {
            card.status = IAnkiStatus.LEARNING;
        }

        switch (card.status) {
            case IAnkiStatus.LEARNING:
                return this.handleLearning(card as IPrivateAnkiCard, rating);
            case IAnkiStatus.REVIEW:
                return this.handleReview(card as IPrivateAnkiCard, rating);
            case IAnkiStatus.RELEARNING:
                return this.handleRelearning(card as IPrivateAnkiCard, rating);
            default:
                throw new Error(invalidCardStatusMessage);
        }
    }

    public handleLearning(card: IPrivateAnkiCard, rating: IAnkiRating): IAnkiResult {
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;
        let baseIntervalWithDeviation: IBaseIntervalWithDeviation | null = null;
        const { learningSteps, startingEase, graduatingInterval, easyInterval } = this.ankiSetting;
        if (learningSteps.length === 0 || (card.step && card.step >= learningSteps.length)) {
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
                // todo: check this line (not included in python source)
                const { fuzzedInterval, fuzzDeviation } = this.getFuzzedInterval(card.reviewInterval);
                baseIntervalWithDeviation = {
                    baseInterval: card.reviewInterval,
                    deviation: fuzzDeviation,
                };
                card.reviewInterval = fuzzedInterval;
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else {
                throw new Error(invalidRatingMessage);
            }
        }
        return { ...card, nextReview, nextReviewInterval, baseIntervalWithDeviation };
    }

    public handleReview(card: IPrivateAnkiCard, rating: IAnkiRating): IAnkiResult {
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;
        let baseIntervalWithDeviation: IBaseIntervalWithDeviation | null = null;
        const {
            newInterval,
            intervalModifier,
            minimumInterval,
            maximumInterval,
            relearningSteps,
            hardInterval,
            easyBonus,
        } = this.ankiSetting;
        if (rating === IAnkiRating.AGAIN) {
            // calculate ease and interval

            // reduce ease by 20%
            card.easinessFactor = Math.max(1.3, parseFloat(card.easinessFactor) * 0.8).toFixed(3);
            card.reviewInterval = Math.round(card.reviewInterval * newInterval * intervalModifier);
            card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
            card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);

            const { fuzzedInterval, fuzzDeviation } = this.getFuzzedInterval(card.reviewInterval);
            baseIntervalWithDeviation = {
                baseInterval: card.reviewInterval,
                deviation: fuzzDeviation,
            };
            card.reviewInterval = fuzzedInterval;
            if (relearningSteps.length > 0) {
                card.status = IAnkiStatus.RELEARNING;
                card.step = 0;
                nextReview = addMinutes(card.lastReviewed, relearningSteps[card.step]);
                nextReviewInterval = {
                    interval: relearningSteps[card.step],
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
            card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
            card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);

            const { fuzzedInterval, fuzzDeviation } = this.getFuzzedInterval(card.reviewInterval);
            baseIntervalWithDeviation = {
                baseInterval: card.reviewInterval,
                deviation: fuzzDeviation,
            };
            card.reviewInterval = fuzzedInterval;
            nextReview = addDays(card.lastReviewed, card.reviewInterval);
            nextReviewInterval = {
                interval: card.reviewInterval,
                timeUnit: TimeUnit.DAY,
            };
        } else if (rating === IAnkiRating.GOOD) {
            // ease stays the same

            // apply days_overdue (situation when user review card later but still remember it)
            const daysOverdue = Math.floor(differenceInHours(card.lastReviewed, card.nextReview) / 24);
            if (daysOverdue >= 1) {
                card.reviewInterval = Math.round(
                    (card.reviewInterval + daysOverdue / 2) * parseFloat(card.easinessFactor) * intervalModifier
                );
            } else {
                card.reviewInterval = Math.round(
                    card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier
                );
            }
            card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
            card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);

            const { fuzzedInterval, fuzzDeviation } = this.getFuzzedInterval(card.reviewInterval);
            baseIntervalWithDeviation = {
                baseInterval: card.reviewInterval,
                deviation: fuzzDeviation,
            };
            card.reviewInterval = fuzzedInterval;
            nextReview = addDays(card.lastReviewed, card.reviewInterval);
            nextReviewInterval = {
                interval: card.reviewInterval,
                timeUnit: TimeUnit.DAY,
            };
        } else if (rating === IAnkiRating.EASY) {
            // apply days_overdue
            const daysOverdue = Math.floor(differenceInHours(card.lastReviewed, card.nextReview) / 24);
            if (daysOverdue >= 1) {
                card.reviewInterval = Math.round(
                    (card.reviewInterval + daysOverdue) * parseFloat(card.easinessFactor) * easyBonus * intervalModifier
                );
            } else {
                card.reviewInterval = Math.round(
                    card.reviewInterval * parseFloat(card.easinessFactor) * easyBonus * intervalModifier
                );
            }

            card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
            card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);

            // increase ease by 15%
            card.easinessFactor = (parseFloat(card.easinessFactor) * 1.15).toFixed(3);

            const { fuzzedInterval, fuzzDeviation } = this.getFuzzedInterval(card.reviewInterval);
            baseIntervalWithDeviation = {
                baseInterval: card.reviewInterval,
                deviation: fuzzDeviation,
            };
            card.reviewInterval = fuzzedInterval;
            nextReview = addDays(card.lastReviewed, card.reviewInterval);
            nextReviewInterval = {
                interval: card.reviewInterval,
                timeUnit: TimeUnit.DAY,
            };
        } else {
            throw new Error(invalidRatingMessage);
        }
        return { ...card, nextReview, nextReviewInterval, baseIntervalWithDeviation };
    }

    // the only difference between this status and LEARNING status
    // is that after finishing RELEARNING phase, it will enter REVIEW status with previous data (including easinessFactor and reviewInterval)
    // rather than assigning some starting constants to easinessFactor & reviewInterval
    public handleRelearning(card: IPrivateAnkiCard, rating: IAnkiRating): IAnkiResult {
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;
        let baseIntervalWithDeviation: IBaseIntervalWithDeviation | null = null;
        const { intervalModifier, minimumInterval, maximumInterval, relearningSteps, easyBonus } = this.ankiSetting;

        if (relearningSteps.length === 0 || (card.step && card.step >= relearningSteps.length)) {
            card.status = IAnkiStatus.REVIEW;
            card.step = null;
            // do not update ease
            card.reviewInterval = Math.round(card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier);
            card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
            card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);
            nextReview = addDays(card.lastReviewed, card.reviewInterval);
            nextReviewInterval = {
                interval: card.reviewInterval,
                timeUnit: TimeUnit.DAY,
            };
        } else {
            if (rating === IAnkiRating.AGAIN) {
                card.step = 0;
                nextReview = addMinutes(card.lastReviewed, relearningSteps[card.step]);
                nextReviewInterval = {
                    interval: relearningSteps[card.step],
                    timeUnit: TimeUnit.MINUTE,
                };
            } else if (rating === IAnkiRating.HARD) {
                // (todo: xem lại cách xử lý)
                // remain the same step

                if (card.step === null) {
                    throw new Error(nullCardStepMessage);
                }

                let nextInterval: number;

                if (card.step === 0 && relearningSteps.length === 1) {
                    nextInterval = relearningSteps[card.step] * 1.5;
                } else if (card.step === 0 && relearningSteps.length >= 2) {
                    nextInterval = (relearningSteps[card.step] + relearningSteps[card.step + 1]) / 2;
                } else {
                    nextInterval = relearningSteps[card.step];
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
                if (card.step + 1 === relearningSteps.length) {
                    card.status = IAnkiStatus.REVIEW;
                    card.step = null;
                    // do not update ease
                    // updating reviewInterval same as updating reviewInterval in REVIEW state for GOOD rating
                    card.reviewInterval = Math.round(
                        card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier
                    );
                    card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
                    card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);
                    nextReview = addDays(card.lastReviewed, card.reviewInterval);
                    nextReviewInterval = {
                        interval: card.reviewInterval,
                        timeUnit: TimeUnit.DAY,
                    };
                } else {
                    card.step += 1;
                    nextReview = addMinutes(card.lastReviewed, relearningSteps[card.step]);
                    nextReviewInterval = {
                        interval: relearningSteps[card.step],
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
                card.reviewInterval = Math.max(card.reviewInterval, minimumInterval);
                card.reviewInterval = Math.min(card.reviewInterval, maximumInterval);
                // todo: check this line (not included in python source)
                const { fuzzedInterval, fuzzDeviation } = this.getFuzzedInterval(card.reviewInterval);
                baseIntervalWithDeviation = {
                    baseInterval: card.reviewInterval,
                    deviation: fuzzDeviation,
                };
                card.reviewInterval = fuzzedInterval;
                nextReview = addDays(card.lastReviewed, card.reviewInterval);
                nextReviewInterval = {
                    interval: card.reviewInterval,
                    timeUnit: TimeUnit.DAY,
                };
            } else {
                throw new Error(invalidRatingMessage);
            }
        }
        return { ...card, nextReview, nextReviewInterval, baseIntervalWithDeviation };
    }

    // todo: test fuzzed functions
    public getFuzzedInterval(interval: number) {
        const { maximumInterval } = this.ankiSetting;
        if (interval < 2.5) {
            return { fuzzedInterval: interval, fuzzDeviation: 0 };
        }
        const { minInterval, maxInterval } = this.getFuzzRange(interval);
        let fuzzedInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        fuzzedInterval = Math.min(Math.round(fuzzedInterval), maximumInterval);
        return { fuzzedInterval, fuzzDeviation: (maxInterval - minInterval) / 2 };
    }

    // get fuzz range (eg. interval = 15 may generate fuzz range [13, 17])
    public getFuzzRange(interval: number) {
        const { maximumInterval } = this.ankiSetting;
        let delta: number = 1;
        for (const fuzzRange of FUZZ_RANGES) {
            delta += fuzzRange['factor'] * Math.max(Math.min(interval, fuzzRange['end']) - fuzzRange['start'], 0);
        }
        let minInterval = Math.round(interval - delta);
        let maxInterval = Math.round(interval + delta);

        minInterval = Math.max(2, minInterval);
        maxInterval = Math.min(maxInterval, maximumInterval);
        minInterval = Math.min(minInterval, maxInterval);

        return { minInterval, maxInterval };
    }
}

export default AnkiService;
