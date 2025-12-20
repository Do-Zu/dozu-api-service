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

export default class LearningStageHandler {
    private readonly fuzzHandler;
    constructor(private readonly ankiSetting: IAnkiSetting) {
        this.fuzzHandler = new Fuzz(ankiSetting);
    }

    public handleLearning(card: IPrivateAnkiCard, rating: IAnkiRating): IAnkiResult {
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;

        // baseIntervalWithDeviation is only set when fuzz is applied
        let baseIntervalWithDeviation: IBaseIntervalWithDeviation | null = null;
        const { learningSteps, startingEase, graduatingInterval, easyInterval } = this.ankiSetting;
        /**
         * card.step > len(self.learning_steps): handles the edge-case when a card was originally scheduled with a scheduler with more
         * learning steps than the current scheduler
         */
        if (learningSteps.length === 0 || (card.step !== null && card.step >= learningSteps.length)) {
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
                // remain the same step

                if (card.step === null) {
                    throw new Error(NULL_STEP_MESSAGE);
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
                    throw new Error(NULL_STEP_MESSAGE);
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
