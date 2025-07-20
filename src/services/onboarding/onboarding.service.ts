import { onboardingRepo } from '@/repositories/onboarding/onboarding.repo';
import { OnboardingResultDto, UserPreferences } from '@/dtos/onboarding/onboarding.dto';
import { NotFoundError, DatabaseError } from '@/core/error';
import { userRepository } from '@/repositories/user/user.repo';

/**
 * Service class for Onboarding functionality
 */
class OnboardingService {
    /**
     * Store user preferences from onboarding result
     */
    async storeOnboardingResult(userId: number, onboardingData: OnboardingResultDto): Promise<void> {
        // Check if user exists
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Prepare preferences object
        const preferences: UserPreferences = {
            interestedTopicTags: onboardingData.interestedTopicTags,
            studyDuration: onboardingData.studyDuration,
            studyMethods: onboardingData.studyMethods,
            onboardingCompletedAt: new Date().toISOString(),
        };

        try {
            // Update user with preferences and onboarding completion status
            await onboardingRepo.updateUserPreferences(userId, preferences);
        } catch {
            throw new DatabaseError('Failed to store onboarding preferences');
        }
    }
}

export const onboardingService = new OnboardingService();
