import SuperMemo from "../superMemo.service";

export type IQualityResponse = 'forgot' | 'partially recalled' | 'recalled with effort' | 'easily recalled';

export default class AnkiSM2 extends SuperMemo<IQualityResponse> {
    calc(): { easinessFactor: number; reviewInterval: number; repetitionNumber: number; } {
        return {
            easinessFactor: 0,
            reviewInterval: 0,
            repetitionNumber: 0
        }
    }

    static getNextReview(lastReviewed: Date | string, reviewInterval: number): string {
        return '';
    }
}