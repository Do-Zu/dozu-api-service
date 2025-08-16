export interface ISuperMemo2 {
    easinessFactor: string
    reviewInterval: number
    repetitionNumber: number
}
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

    abstract calc() : ISuperMemo2;

    static getNextReview(lastReviewed: Date | string, reviewInterval: number) : string {
        throw new Error('getNextReview() must be implemented by the implementation class');
    };
}