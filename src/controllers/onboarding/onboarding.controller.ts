import { Request, Response } from 'express';
import { onboardingService } from '@/services/onboarding/onboarding.service';
import { SuccessResponse } from '@/core/success';
import { onboardingResultSchema, OnboardingResultDto } from '@/dtos/onboarding/onboarding.dto';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { BadRequest } from '@/core/error';

/**
 * Controller class for Onboarding functionality
 */
class OnboardingController {
    /**
     * Store onboarding result and update user preferences
     */
    async storeOnboardingResult(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);

        // Validate request body
        let validatedData: OnboardingResultDto;
        try {
            validatedData = onboardingResultSchema.parse(req.body);
        } catch {
            throw new BadRequest('Invalid request data');
        }

        // Store onboarding preferences
        await onboardingService.storeOnboardingResult(userId, validatedData);

        SuccessResponse.ok(
            res,
            {
                message: 'Onboarding completed successfully',
                preferences: validatedData,
            },
            'Onboarding preferences stored successfully'
        );
    }
}

export const onboardingController = new OnboardingController();
