import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import flashcardService, { IFlashcardWithReviewPrediction } from '@/services/flashcard/flashcard.service';
import topicService from '@/services/topic/topic.service';
import {
    IFlashcard,
    IFlashcardLearningState,
    IFlashcardsBatchInput,
    IFlashcardBatchResult,
} from '@/types/flashcard/flashcard.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import SuperMemo2, { IQualityResponse } from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentDateFromRequest } from '@/utils/date';
import requestHelper from '@/core/request/request.helper';
import unsplashLib, { IUnspashImage } from '@/libs/unsplash.lib';
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

    public async batchFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        const { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatchInput = req.body;

        const result: IFlashcardBatchResult = await flashcardService.batchFlashcardsForTopic(userId, topicId, {
            flashcardsAdded,
            flashcardsUpdated,
            flashcardsDeleted,
        });

        SuccessResponse.created(res, result);
    }

    public async handleBatchFlashcardsForNode(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);

        // let { topicId } = req.body as { topicId: string };
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

        try {
            await flashcardService.handleBatchFlashcardsForNode(userId, parsedTopicId, nodeId, {
                flashcardsAdded,
                flashcardsUpdated,
                flashcardsDeleted,
            });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.created(res, {});
    }

    // todo-ka: check if this necessary, yes => create middleware for security
    // public async getDueFlashcardsForUser(req: Request, res: Response): Promise<void> {
    //     const currentDate = getCurrentDateFromRequest(req);
    //     const userId = getUserIdFromRequest(req);

    //     let flashcards: IFlashcardsLearningForUserReturned;
    //     try {
    //         flashcards = await flashcardService.getDueFlashcardsForUser(userId, currentDate);
    //     } catch (err) {
    //         logger.error(err);
    //         throw new DatabaseError('Something went wrong :((');
    //     }

    //     let flashcardsReturned: IFlashcardNextReviewReturned[] =
    //         await flashcardService.getReviewIntervalsByQualityResponses(flashcards);

    //     SuccessResponse.ok(res, flashcardsReturned);
    // }

    public async getDueFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        const currentDate = getCurrentDateFromRequest(req);
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        const flashcards = await flashcardService.getDueFlashcardsForTopicAndUser(topicId, userId, currentDate);

        const flashcardsReturned: IFlashcardWithReviewPrediction[] =
            await flashcardService.getReviewIntervalsByQualityResponses(flashcards);

        SuccessResponse.ok(res, flashcardsReturned);
    }

    public async reviewFlashcardWithQuality(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const flashcardId = requestHelper.getIdParam(req, 'flashcardId');
        const { qualityResponse } = req.body as { qualityResponse: IQualityResponse };

        const flashcard: IFlashcardLearningState =
            await flashcardService.getSpacedRepetitionDataForFlashcard(flashcardId);

        if (!flashcard) {
            throw new BadRequest('Flashcard is invalid');
        }
        const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
        const currentDate = getCurrentDateFromRequest(req);

        const superMemo2 = new SuperMemo2(easinessFactor, reviewInterval, repetitionNumber, qualityResponse);
        const sm2 = superMemo2.calc();

        const nextReview = SuperMemo2.getNextReview(currentDate, sm2.reviewInterval);

        const sm2Info: Omit<IFlashcardLearningState, 'status'> = {
            repetitionNumber: sm2.repetitionNumber,
            easinessFactor: sm2.easinessFactor,
            reviewInterval: sm2.reviewInterval,
            lastReviewed: currentDate,
            nextReview,
        };

        try {
            await flashcardService.applySM2ToFlashcard(userId, flashcardId, sm2Info);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, {});
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
}

export default new FlashcardController();
