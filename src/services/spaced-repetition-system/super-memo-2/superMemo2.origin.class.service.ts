import SuperMemo from "../superMemo.service";
import { getDateAdded, getDateFormatted } from "@/utils/date";

export type IQualityResponse = 0 | 1 | 2 | 3 | 4 | 5;

export default class SuperMemo2 extends SuperMemo<IQualityResponse> {
    // constructor(easinessFactor: number | string, reviewInterval: number, repetitionNumber: number, qualityResponse: IQualityResponse) {
    //     super(easinessFactor, reviewInterval, repetitionNumber, qualityResponse);
    // }

    calc(): { easinessFactor: number; reviewInterval: number; repetitionNumber: number; } {
        let newEasinessFactor: number, newReviewInterval: number, newRepetitionNumber: number = this.repetitionNumber;

        newEasinessFactor = this.easinessFactor + (0.1 - (5 - this.qualityResponse) * (0.08 + (5 - this.qualityResponse) * 0.02));
        newEasinessFactor = Math.max(1.3, newEasinessFactor);

        if(this.qualityResponse >= 3) {
            if(this.repetitionNumber === 0) newReviewInterval = 1;
            else if(this.repetitionNumber === 1) newReviewInterval = 6;
            else newReviewInterval = Math.round(this.reviewInterval * newEasinessFactor);
            ++newRepetitionNumber;
        } else {
            newRepetitionNumber = 0;
            newReviewInterval = 1;
        }

        return {
            easinessFactor: newEasinessFactor,
            reviewInterval: newReviewInterval,
            repetitionNumber: newRepetitionNumber
        }
    }

    static getNextReview(lastReviewed: Date | string, reviewInterval: number): string {
        const result = getDateAdded(lastReviewed, reviewInterval);
        return getDateFormatted(result);
    }
}