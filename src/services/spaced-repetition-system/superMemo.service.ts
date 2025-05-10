import { IQualityResponse } from "./super-memo-2/superMemo2.origin.class.service"; 

export default abstract class SuperMemo<QualityResponse> {
    public easinessFactor: number;
    public reviewInterval: number;
    public repetitionNumber: number;
    public qualityResponse: QualityResponse;

    constructor(easinessFactor: number | string, reviewInterval: number, repetitionNumber: number, qualityResponse: QualityResponse) {
        if(typeof easinessFactor === 'string') {
            easinessFactor = parseFloat(easinessFactor);
            if(isNaN(easinessFactor)) throw new Error('easinessFactor is invalid');
        } 
        this.easinessFactor = easinessFactor;
        
        this.reviewInterval = reviewInterval;
        this.repetitionNumber = repetitionNumber;
        this.qualityResponse = qualityResponse;
    }

    abstract calc() : { easinessFactor: number, reviewInterval: number, repetitionNumber: number };

    static getNextReview(lastReviewed: Date | string, reviewInterval: number) : string {
        throw new Error('getNextReview() must be implemented by the implementation class');
    };
}