import db from '@/libs/drizzleClient.lib';
import { usersTable } from '@/models/user.model';
import { eq } from 'drizzle-orm';
import { UserPreferences } from '@/dtos/onboarding/onboarding.dto';
import { getSystemDate } from '@/utils/date';

/**
 * Repository for Onboarding data access operations
 */
class OnboardingRepository {
    /**
     * Update user preferences after onboarding completion
     */
    async updateUserPreferences(userId: number, preferences: UserPreferences): Promise<void> {
        await db
            .update(usersTable)
            .set({
                preferences: preferences,
                hasCompletedOnboarding: true,
                isNewUser: false,
                updatedAt: getSystemDate(),
            })
            .where(eq(usersTable.userId, userId));
    }
}

export const onboardingRepo = new OnboardingRepository();
