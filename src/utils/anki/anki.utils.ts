import { IAnkiStatus } from '@/services/spaced-repetition-system/super-memo-2/anki.service';

class AnkiUtils {
    public getDefaultAnkiValues({ currentDate }: { currentDate: string }) {
        return {
            repetitionNumber: 0,
            easinessFactor: '2.5',
            reviewInterval: 0,
            lastReviewed: null,
            nextReview: currentDate,
            status: IAnkiStatus.NEW,
            step: 0,
        };
    }
}

export default new AnkiUtils();