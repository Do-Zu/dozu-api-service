import { feynmanRepo } from '@/repositories/feynman/feynman.repo';
import {
    FeynmanSessionSavePayload,
    FeynmanSessionUpdate,
    ICompareSimilarityRequest,
    IGetSession,
    IUpdateReview,
} from '@/types/feynman/feynman.type';
import { safeDestructure } from '@/utils/common';
import { embeddingApiService } from '../embedding/v1/constant/api';

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

    public compareSimilarQuestionAnswer = async (payload: ICompareSimilarityRequest) => {
        const { pattern, query } = safeDestructure(payload);

        const MAX_SCORE = 4;

        const { similarity } = await embeddingApiService.compareEmbedding({ pattern, query });

        // Calculate score based on similarity thresholds
        const score = Math.min(Math.ceil(similarity / 0.25), MAX_SCORE);

        return {
            similarityAnswer: similarity,
            score,
            maxScore: MAX_SCORE,
            isCorrect: similarity > 0.75,
        };
    };
}

export const feynmanService = new FeynmanService();
