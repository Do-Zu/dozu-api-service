export type IAnkiSetting = {
    ankiSettingId: number;
    userId: number;
    isDefault: boolean;
    name: string;
    learningSteps: number[];
    graduatingInterval: number;
    easyInterval: number;
    relearningSteps: number[];
    minimumInterval: number;
    maximumInterval: number;
    startingEase: number;
    easyBonus: number;
    intervalModifier: number;
    hardInterval: number;
    newInterval: number;
    newCardsPerDay: number;
    maximumReviewsPerDay: number;
};

export type IUpdateAnkiSettingBody = Partial<Omit<IAnkiSetting, 'ankiSettingId' | 'userId' | 'isDefault'>>;
