import { feynmanRepo } from '@/repositories/feynman/feynman.repo';
import {
    FeynmanSessionSavePayload,
    FeynmanSessionUpdate,
    IGetSession,
    IUpdateReview,
} from '@/types/feynman/feynman.type';

/**
 * Service class for Feynman functionality
 */
class FeynmanService {
    public storageSessionFeynman = async (payload: FeynmanSessionSavePayload) => {
        await feynmanRepo.storageSessionFeynman({
            ...payload,
        });
        return { success: true };
    };

    public getFeynmanSession = async (session: IGetSession) => {
        const sessions = await feynmanRepo.getSession(session);
        return sessions;
    };

    public updateReview = async (payload: IUpdateReview) => {
        await feynmanRepo.updateReviewSession(payload);
    };

    public updateSession = async (payload: FeynmanSessionUpdate) => {
        await feynmanRepo.updateSession(payload);
    };
}

export const feynmanService = new FeynmanService();
