import { IAnkiSetting } from '@/types/anki-setting/ankiSetting.type';

const FUZZ_RANGES = [
    {
        start: 2.5,
        end: 7,
        factor: 0.15,
    },
    {
        start: 7,
        end: 20,
        factor: 0.1,
    },
    {
        start: 20,
        end: Infinity,
        factor: 0.05,
    },
];

export default class Fuzz {
    constructor(private readonly ankiSetting: IAnkiSetting) {}

    public getFuzzedInterval(interval: number) {
        const { maximumInterval } = this.ankiSetting;
        if (interval < 2.5) {
            return { fuzzedInterval: interval, fuzzDeviation: 0 };
        }
        const { minInterval, maxInterval } = this.getFuzzRange(interval);
        let fuzzedInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        fuzzedInterval = Math.min(Math.round(fuzzedInterval), maximumInterval);
        return { fuzzedInterval, fuzzDeviation: (maxInterval - minInterval) / 2 };
    }

    // get fuzz range (eg. interval = 15 may generate fuzz range [13, 17])
    public getFuzzRange(interval: number) {
        const { maximumInterval } = this.ankiSetting;
        let delta: number = 1;
        for (const fuzzRange of FUZZ_RANGES) {
            delta += fuzzRange['factor'] * Math.max(Math.min(interval, fuzzRange['end']) - fuzzRange['start'], 0);
        }
        let minInterval = Math.round(interval - delta);
        let maxInterval = Math.round(interval + delta);

        minInterval = Math.max(2, minInterval);
        maxInterval = Math.min(maxInterval, maximumInterval);
        minInterval = Math.min(minInterval, maxInterval);

        return { minInterval, maxInterval };
    }
}
