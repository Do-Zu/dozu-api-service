import { getDateAdded, getDateFormatted } from "@/utils/date";

type IQualityResponse = 0 | 1 | 2 | 3 | 4 | 5;

interface SM2 {
    easinessFactor: number | string
    reviewInterval: number
    qualityResponse: IQualityResponse
    repetitionNumber: number
}

export function sm2(input: SM2): { easinessFactor: number, reviewInterval: number, repetitionNumber: number } {
    let { easinessFactor, reviewInterval, qualityResponse, repetitionNumber } = input;
    if(typeof easinessFactor === 'string') {
        easinessFactor = parseFloat(easinessFactor);
        if(isNaN(easinessFactor)) throw new Error('easinessFactor is invalid');
    }

    let newEasinessFactor: number, newReviewInterval: number, newRepetitionNumber: number = repetitionNumber;

    newEasinessFactor = easinessFactor + (0.1 - (5 - qualityResponse) * (0.08 + (5 - qualityResponse) * 0.02));
    newEasinessFactor = Math.max(1.3, newEasinessFactor);

    if(qualityResponse >= 3) {
        if(repetitionNumber === 0) newReviewInterval = 1;
        else if(repetitionNumber === 1) newReviewInterval = 6;
        else newReviewInterval = Math.round(reviewInterval * newEasinessFactor);
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

// nếu user ôn không đúng ngày được scheduled thì sao?
// lastReviewed nên là constant, luôn là Date.now()
export function getNextReview(lastReviewed: Date | string, reviewInterval: number) : string {
    const result = getDateAdded(lastReviewed, reviewInterval);
    return getDateFormatted(result);
}

