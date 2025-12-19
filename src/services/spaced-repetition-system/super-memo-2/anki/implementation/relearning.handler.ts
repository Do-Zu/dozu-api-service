import {
    IAnkiResult,
    IAnkiRating,
    IAnkiStatus,
    IBaseIntervalWithDeviation,
    INextReviewInterval,
} from '../../anki.service';
import { IAnkiSetting } from '@/types/anki-setting/ankiSetting.type';
import { addDays, addMinutes } from 'date-fns';
import { IPrivateAnkiCard } from './anki-scheduler';
import Fuzz from './fuzz';
import { TimeUnit } from '@/utils/date';
import { INVALID_RATING_MESSAGE, NULL_STEP_MESSAGE } from '../constants/anki.constant';

export default class RelearningStageHandler {
    private fuzzHandler;
    constructor(private readonly ankiSetting: IAnkiSetting) {
        this.fuzzHandler = new Fuzz(ankiSetting);
    }

    private clampReviewInterval(reviewInterval: number) {
        const { minimumInterval, maximumInterval } = this.ankiSetting;
        const tempReviewInterval = Math.max(reviewInterval, minimumInterval);
        const result = Math.min(tempReviewInterval, maximumInterval);
        return result;
    }

    public handleRelearning(card: IPrivateAnkiCard, rating: IAnkiRating): IAnkiResult {
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;
        let baseIntervalWithDeviation: IBaseIntervalWithDeviation | null = null;
        const { intervalModifier, relearningSteps, easyBonus } = this.ankiSetting;

        if (relearningSteps.length === 0 || (card.step !== null && card.step >= relearningSteps.length)) {
            card.status = IAnkiStatus.REVIEW;
            card.step = null;

            // do not update ease
            card.reviewInterval = Math.round(card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier);
            card.reviewInterval = this.clampReviewInterval(card.reviewInterval);
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
                if (card.step === null) {
                    throw new Error(NULL_STEP_MESSAGE);
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
                    throw new Error(NULL_STEP_MESSAGE);
                }
                if (card.step + 1 === relearningSteps.length) {
                    card.status = IAnkiStatus.REVIEW;
                    card.step = null;
                    // do not update ease
                    // updating reviewInterval same as updating reviewInterval in REVIEW state for GOOD rating
                    card.reviewInterval = Math.round(
                        card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier
                    );
                    card.reviewInterval = this.clampReviewInterval(card.reviewInterval);
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
                card.reviewInterval = this.clampReviewInterval(card.reviewInterval);
                // todo: check this line (not included in python source)
                const { fuzzedInterval, fuzzDeviation } = this.fuzzHandler.getFuzzedInterval(card.reviewInterval);
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
                throw new Error(INVALID_RATING_MESSAGE);
            }
        }
        return { ...card, nextReview, nextReviewInterval, baseIntervalWithDeviation };
    }
}
