export const DEFAULT_ANKI_SETTING = {
    isDefault: true,
    learningSteps: [1, 10], 
    graduatingInterval: 1,
    easyInterval: 4, 
    relearningSteps: [10], 
    minimumInterval: 1, 
    maximumInterval: 36500, 
    startingEase: 2.5,
    easyBonus: 1.3,
    intervalModifier: 1.0,
    hardInterval: 1.2,
    newInterval: 0.0,
    newCardsPerDay: 20,
    maximumReviewsPerDay: 200,
} as const;

export const DEFAULT_SETTING_NAME = "Default";