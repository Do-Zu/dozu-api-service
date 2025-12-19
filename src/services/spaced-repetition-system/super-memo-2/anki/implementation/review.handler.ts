import {
    IAnkiResult,
    IAnkiRating,
    IAnkiStatus,
    IBaseIntervalWithDeviation,
    INextReviewInterval,
} from '../../anki.service';
import { IAnkiSetting } from '@/types/anki-setting/ankiSetting.type';
import { addDays, addMinutes, differenceInHours } from 'date-fns';
import { IPrivateAnkiCard } from './anki-scheduler';
import Fuzz from './fuzz';
import { TimeUnit } from '@/utils/date';
import { INVALID_RATING_MESSAGE } from '../constants/anki.constant';

export default class ReviewStageHandler {
    private fuzzHandler;
    constructor(private readonly ankiSetting: IAnkiSetting) {
        this.fuzzHandler = new Fuzz(ankiSetting);
    }

    private calculateDaysOverdue(lastReviewed: Date, nextReview: Date) {
        return Math.floor(differenceInHours(lastReviewed, nextReview) / 24);
    }

    private clampReviewInterval(reviewInterval: number) {
        const { minimumInterval, maximumInterval } = this.ankiSetting;
        const tempReviewInterval = Math.max(reviewInterval, minimumInterval);
        const result = Math.min(tempReviewInterval, maximumInterval);
        return result;
    }

    public handleReview(card: IPrivateAnkiCard, rating: IAnkiRating): IAnkiResult {
        let nextReview: Date;
        let nextReviewInterval: INextReviewInterval;
        let baseIntervalWithDeviation: IBaseIntervalWithDeviation | null = null;
        const { newInterval, intervalModifier, relearningSteps, hardInterval, easyBonus } = this.ankiSetting;
        if (rating === IAnkiRating.AGAIN) {
            // calculate ease and interval

            // reduce ease by 20%
            card.easinessFactor = Math.max(1.3, parseFloat(card.easinessFactor) * 0.8).toFixed(3);
            card.reviewInterval = Math.round(card.reviewInterval * newInterval * intervalModifier);
            card.reviewInterval = this.clampReviewInterval(card.reviewInterval);

            if (relearningSteps.length > 0) {
                card.status = IAnkiStatus.RELEARNING;
                card.step = 0;
                nextReview = addMinutes(card.lastReviewed, relearningSteps[card.step]);
                nextReviewInterval = {
                    interval: relearningSteps[card.step],
                    timeUnit: TimeUnit.MINUTE,
                };
            } else {
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
            }
        } else if (rating === IAnkiRating.HARD) {
            // calculate ease and interval
            card.easinessFactor = Math.max(1.3, parseFloat(card.easinessFactor) * 0.85).toFixed(3);
            card.reviewInterval = Math.round(card.reviewInterval * hardInterval * intervalModifier);
            card.reviewInterval = this.clampReviewInterval(card.reviewInterval);

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
        } else if (rating === IAnkiRating.GOOD) {
            // ease stays the same

            // apply days_overdue (situation when user review card later but still remember it)
            const daysOverdue = this.calculateDaysOverdue(card.lastReviewed, card.nextReview);
            if (daysOverdue >= 1) {
                card.reviewInterval = Math.round(
                    (card.reviewInterval + daysOverdue / 2) * parseFloat(card.easinessFactor) * intervalModifier
                );
            } else {
                card.reviewInterval = Math.round(
                    card.reviewInterval * parseFloat(card.easinessFactor) * intervalModifier
                );
            }
            card.reviewInterval = this.clampReviewInterval(card.reviewInterval);

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
        } else if (rating === IAnkiRating.EASY) {
            // apply days_overdue
            const daysOverdue = this.calculateDaysOverdue(card.lastReviewed, card.nextReview);
            if (daysOverdue >= 1) {
                card.reviewInterval = Math.round(
                    (card.reviewInterval + daysOverdue) * parseFloat(card.easinessFactor) * easyBonus * intervalModifier
                );
            } else {
                card.reviewInterval = Math.round(
                    card.reviewInterval * parseFloat(card.easinessFactor) * easyBonus * intervalModifier
                );
            }

            card.reviewInterval = this.clampReviewInterval(card.reviewInterval);

            // increase ease by 15%
            card.easinessFactor = (parseFloat(card.easinessFactor) * 1.15).toFixed(3);

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
        return { ...card, nextReview, nextReviewInterval, baseIntervalWithDeviation };
    }
}
