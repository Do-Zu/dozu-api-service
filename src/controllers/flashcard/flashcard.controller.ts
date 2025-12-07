import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import flashcardService from '@/services/flashcard/flashcard.service';
import topicService from '@/services/topic/topic.service';
import {
    IFlashcard,
    IFlashcardLearningState,
    IFlashcardsBatchInput,
    IFlashcardBatchResult,
    IAnkiCardReviewed,
} from '@/types/flashcard/flashcard.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { TimeUnit } from '@/utils/date';
import requestHelper from '@/core/request/request.helper';
import unsplashLib, { IUnspashImage } from '@/libs/unsplash.lib';
import AnkiService, {
    IAnkiCard,
    IAnkiRating,
    learnAheadLimit,
} from '@/services/spaced-repetition-system/super-memo-2/anki.service';
import ankiSettingService from '@/services/anki-setting/ankiSetting.service';
class FlashcardController {
    constructor() {}

    public async getFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const topic = requestHelper.getResource(req, 'topic');

        const flashcards: IFlashcard[] = await flashcardService.getFlashcardsForTopic(topicId);

        let { includeTopic } = req.query as { includeTopic: string | boolean };
        // !! should check other dev using this API (for including includeTopic)
        includeTopic = includeTopic && includeTopic === 'true';
        if (includeTopic) {
            const topicName = topic!.name; // not undefined because of middlewares
            SuccessResponse.ok(res, { flashcards, topicName });
        } else {
            SuccessResponse.ok(res, flashcards);
        }
    }

    public async batchFlashcardsForTopicChanges(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        const { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatchInput = req.body;
        const data = { flashcardsAdded, flashcardsUpdated, flashcardsDeleted };

        const result: IFlashcardBatchResult = await flashcardService.batchFlashcardsForTopic({ userId, topicId, data });

        SuccessResponse.created(res, result);
    }

    public async handleBatchFlashcardsForNode(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);

        let { topicId } = req.params as { topicId: string };
        let { nodeId } = req.body as { nodeId: string };

        let parsedTopicId = parseInt(topicId as string);

        if (isNaN(parsedTopicId)) {
            logger.warn('topicId is NaN');
            throw new BadRequest('Invalid param, cannot create flashcards');
        }

        if (!nodeId) {
            logger.warn('topicId is empty');
            throw new BadRequest('Invalid param, cannot create flashcards');
        }

        const isExistedTopic = await topicService.doesTopicExist(parsedTopicId);
        if (!isExistedTopic) {
            throw new BadRequest('Invalid topic');
        }

        const { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatchInput = req.body.flashcards;

        await flashcardService.handleBatchFlashcardsForNode(userId, parsedTopicId, nodeId, {
            flashcardsAdded,
            flashcardsUpdated,
            flashcardsDeleted,
        });

        SuccessResponse.created(res, {});
    }

    public async searchFlashcardImages(req: Request, res: Response) {
        const { search } = req.body as { search?: string | null };
        if (!search) {
            throw new BadRequest('Search params must be provided');
        }
        const unsplashResult = await unsplashLib.searchImages(search);
        const result: IUnspashImage[] = unsplashResult.results.map(element => {
            return {
                id: element.id,
                width: element.width, // original width (px) of image
                height: element.height, // original height (px) of image
                description: element.description,
                url: {
                    thumb: element.urls.thumb, // thumb for preview image,
                    small: element.urls.small, // image for flashcards later
                },
                user: element.user, // attribute Unsplash & the Unsplash photographer
                links: element.links, // links for storing download_location (using an image from client must 'download' the image to use)
            };
        });

        SuccessResponse.ok(res, result);
    }

    // Anki SM2 algorithm
    public async reviewFlashcardByAnki(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const flashcardId = requestHelper.getIdParam(req, 'flashcardId');
        const { rating } = req.body as { rating: IAnkiRating };

        const flashcard: IFlashcardLearningState =
            await flashcardService.getSpacedRepetitionDataForFlashcard(flashcardId);

        if (!flashcard) {
            throw new BadRequest('Flashcard is invalid');
        }

        const ankiCard: IAnkiCard = {
            ...flashcard,
            step: flashcard.step,
            flashcardId,
            lastReviewed: flashcard.lastReviewed ? new Date(flashcard.lastReviewed) : null,
            nextReview: new Date(flashcard.nextReview),
        };

        const ankiSetting = await ankiSettingService.getSettingForTopicAndUser(topicId, userId);
        const ankiService = new AnkiService(ankiSetting);
        const ankiResult = ankiService.schedule(ankiCard, rating);

        const sm2Info: IFlashcardLearningState = {
            repetitionNumber: 0,
            status: ankiResult.status,
            easinessFactor: ankiResult.easinessFactor,
            reviewInterval: ankiResult.reviewInterval,
            lastReviewed: ankiResult.lastReviewed ? ankiResult.lastReviewed.toISOString() : null,
            nextReview: ankiResult.nextReview.toISOString(),
            step: ankiResult.step,
        };

        await flashcardService.applySM2ToFlashcard(userId, flashcardId, sm2Info);

        // Award points for flashcard review
        try {
            const pointsService = (await import('@/services/gamification/points.service')).default;
            await pointsService.awardFlashcardReview(userId, flashcardId);
        } catch (error) {
            console.error('Failed to award flashcard review points:', error);
        }

        let result: IAnkiCardReviewed | null;
        if (
            ankiResult.nextReviewInterval.timeUnit === TimeUnit.MINUTE &&
            ankiResult.nextReviewInterval.interval <= learnAheadLimit
        ) {
            result = {
                flashcardId,
                nextReview: sm2Info.nextReview,
                status: sm2Info.status,
                learningState: sm2Info,
                rating,
            };
        } else {
            result = null;
        }

        SuccessResponse.ok(res, result);
    }

    public async toggleStar(req: Request, res: Response): Promise<void> {
        const flashcardId = requestHelper.getIdParam(req, 'flashcardId');
        const result = await flashcardService.toggleStar(flashcardId);
        SuccessResponse.ok(res, result);
    }
}

export default new FlashcardController();
