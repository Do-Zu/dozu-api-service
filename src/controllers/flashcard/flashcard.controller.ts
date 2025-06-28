import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import FlashcardService, { IFlashcardNextReviewReturned } from '@/services/flashcard/flashcard.service';
import TopicService from '@/services/topic/topic.service';
import { IFlashcardsBatch } from '@/types/flashcard/flashcard.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import SuperMemo2, { IQualityResponse } from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getDateFormatted } from '@/utils/date';
import {
    IApplyFlashcardSM2ArgumentSM2,
    IFlashcardsForTopicReturned,
    IFlashcardsLearningForUserReturned,
    IFlashcardSpacedRepetitionReturned,
} from '@/repositories/flashcard.repo';

const flashcardService = new FlashcardService();
const topicService = new TopicService();

class FlashcardController {
    constructor() {}

    // done
    public async handleGetAllFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.query as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot get flashcards');
        }

        const topic = await topicService.handleGetSingleTopic(topicId);
        if (!topic) {
            throw new BadRequest('Invalid topic');
        }

        let flashcards: IFlashcardsForTopicReturned;
        try {
            flashcards = await flashcardService.handleGetAllFlashcardsForTopic(topicId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong, cannot get flashcards');
        }

        let topicName = topic.name;
        SuccessResponse.ok(res, { flashcards, topicName });
    }

    public async handleBatchFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        let { topicId } = req.query as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if (isNaN(topicId)) {
            logger.warn('topicId is NaN');
            throw new BadRequest('Invalid param, cannot create flashcards');
        }

        const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
        if (!isExistedTopic) {
            throw new BadRequest('Invalid topic');
        }

        const { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatch = req.body;

        try {
            await flashcardService.handleBatchFlashcardsForTopic(userId, topicId, {
                flashcardsAdded,
                flashcardsUpdated,
                flashcardsDeleted,
            });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.created(res, {});
    }

    public async handleGetFlashcardsLearningForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);

        let flashcards: IFlashcardsLearningForUserReturned;
        try {
            flashcards = await flashcardService.handleGetFlashcardsLearningForUser(userId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        let flashcardsReturned: IFlashcardNextReviewReturned[] =
            await flashcardService.handleGetNextReviewIntervalsForAllQualityResponses(flashcards);

        SuccessResponse.ok(res, flashcardsReturned);
    }

    public async handleGetFlashcardsLearningForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.params as { topicId: string | number };
        topicId = parseInt(topicId as string);

        let flashcards: IFlashcardsLearningForUserReturned;
        try {
            flashcards = await flashcardService.handleGetFlashcardsLearningForTopic(topicId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        let flashcardsReturned: IFlashcardNextReviewReturned[] =
            await flashcardService.handleGetNextReviewIntervalsForAllQualityResponses(flashcards);

        SuccessResponse.ok(res, flashcardsReturned);
    }

    public async handlePutFlashcardToLearning(req: Request, res: Response): Promise<void> {
        let { flashcardId } = req.params as { flashcardId: string | number };

        flashcardId = parseInt(flashcardId as string);

        if (isNaN(flashcardId)) {
            logger.warn('flashcardId is NaN');
            throw new BadRequest('Invalid param, cannot set flashcard to practice');
        }

        try {
            await flashcardService.handlePutFlashcardToLearning(flashcardId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.ok(res, {});
    }

    public async handleTrackSingleFlashcard(req: Request, res: Response): Promise<void> {
        let { flashcardId } = req.params as { flashcardId: string | number };
        const { qualityResponse } = req.body as { qualityResponse: IQualityResponse };

        flashcardId = parseInt(flashcardId as string);

        if (isNaN(flashcardId)) {
            logger.warn('flashcardId is NaN');
            throw new BadRequest('Invalid param, cannot track flashcard');
        }

        let flashcard: IFlashcardSpacedRepetitionReturned;
        try {
            flashcard = await flashcardService.handleGetFlashcardSpacedRepetition(flashcardId);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        if (!flashcard) {
            throw new BadRequest('Flashcard is invalid');
        }
        const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
        const currentDate = new Date(Date.now());

        const superMemo2 = new SuperMemo2(easinessFactor, reviewInterval, repetitionNumber, qualityResponse);
        const sm2 = superMemo2.calc();

        let nextReview = SuperMemo2.getNextReview(currentDate, sm2.reviewInterval);

        let sm2Info: IApplyFlashcardSM2ArgumentSM2 = {
            repetitionNumber: sm2.repetitionNumber,
            easinessFactor: sm2.easinessFactor,
            reviewInterval: sm2.reviewInterval,
            lastReviewed: getDateFormatted(currentDate),
            nextReview,
        };

        try {
            await flashcardService.handleApplyFlashcardSM2(flashcardId, sm2Info);
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.ok(res, {});
    }
}

export default FlashcardController;
