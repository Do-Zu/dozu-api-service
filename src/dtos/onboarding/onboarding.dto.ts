import { z } from 'zod';

export const onboardingResultSchema = z.object({
    interestedTopicTags: z.array(z.string()).min(1, 'At least one topic tag is required'),
    studyDuration: z.number().min(5).max(480, 'Study duration invalid'),
    studyMethods: z.array(z.string()).min(1, 'At least one study method is required'),
});

export type OnboardingResultDto = z.infer<typeof onboardingResultSchema>;

// Preferences interface for user table
export interface UserPreferences {
    interestedTopicTags: string[];
    studyDuration: number;
    studyMethods: string[];
    onboardingCompletedAt: string;
}
