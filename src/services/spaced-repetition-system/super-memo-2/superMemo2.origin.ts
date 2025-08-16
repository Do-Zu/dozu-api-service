import SuperMemo, { ISuperMemo2 } from '../superMemo.service';
import { getDateAdded, getDateFormatted } from '@/utils/date';

export type IQualityResponse = 0 | 1 | 2 | 3 | 4 | 5;

export default class SuperMemo2 extends SuperMemo<IQualityResponse> {
    calc(): ISuperMemo2 {
        let newEasinessFactor: number,
            newReviewInterval: number,
            newRepetitionNumber: number = this.repetitionNumber;

        newEasinessFactor =
            this.easinessFactor + (0.1 - (5 - this.qualityResponse) * (0.08 + (5 - this.qualityResponse) * 0.02));
        newEasinessFactor = Math.max(1.3, newEasinessFactor);

        if (this.qualityResponse >= 3) {
            if (this.repetitionNumber === 0) newReviewInterval = 1;
            else if (this.repetitionNumber === 1) newReviewInterval = 6;
            else newReviewInterval = Math.round(this.reviewInterval * newEasinessFactor);
            ++newRepetitionNumber;
        } else {
            newRepetitionNumber = 0;
            newReviewInterval = 1;
        }

        return {
            easinessFactor: newEasinessFactor.toPrecision(3),
            reviewInterval: newReviewInterval,
            repetitionNumber: newRepetitionNumber,
        };
    }

    static getNextReview(lastReviewed: Date | string, reviewInterval: number): string {
        const result = getDateAdded(lastReviewed, reviewInterval);
        return getDateFormatted(result);
    }
}
