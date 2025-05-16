import { BadRequest, DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import FlashcardService from "@/services/flashcard/flashcard.service";
import TopicService from "@/services/topic/topic.service";
import { IBasicFlashcardReturned, IFlashcardAdded, IFlashcardPracticed, IFlashcardProgressUpdated, IFlashcardReturned, IFlashcardsBatch, IFlashcardSuperMemo, IFlashcardUpdated } from "@/types/flashcard/flashcard.type";
import logger from "@/utils/logger";
import { Request, Response } from "express";
// import { getNextReview, sm2 } from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin.service';
import SuperMemo2, { IQualityResponse } from "@/services/spaced-repetition-system/super-memo-2/superMemo2.origin.class.service";

const flashcardService = new FlashcardService();
const topicService = new TopicService();

class FlashcardController {
    constructor() {}

    public async handleGetAllFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.query as { topicId: string | number };

        topicId = parseInt(topicId as string);
        
        if(isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot get flashcards');
        }

        const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
        if(!isExistedTopic) {
            throw new BadRequest('Invalid topic');
        }

        let flashcards : IBasicFlashcardReturned[];
        try {
            flashcards = await flashcardService.handleGetAllFlashcardsForTopic(topicId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong, cannot get flashcards');
        }
        SuccessResponse.ok(res, { flashcards });
    }

    public async handleInsertFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.query as { topicId: string | number };
        if(!topicId) {
            throw new BadRequest('Invalid param, cannot create flashcards');
        }

        topicId = parseInt(topicId as string);
        
        if(isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot create flashcards');
        }

        const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
        if(!isExistedTopic) {
            throw new BadRequest('Invalid topic');
        }

        const { flashcards } = req.body as { flashcards: IFlashcardAdded[] };
        let result : IBasicFlashcardReturned[];
        try {
            result = await flashcardService.handleInsertFlashcardsForTopic(topicId, flashcards);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong, cannot create flashcards');
        }

        SuccessResponse.ok(res, { flashcards: result });
    }

    public async handleBatchFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        let { topicId } = req.query as { topicId: string | number };

        topicId = parseInt(topicId as string);
        
        if(isNaN(topicId)) {
            logger.warn('topicId is NaN');
            throw new BadRequest('Invalid param, cannot create flashcards');
        }

        const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
        if(!isExistedTopic) {
            throw new BadRequest('Invalid topic');
        }

        const { flashcardsAdded, flashcardsUpdated, flashcardsDeleted } : IFlashcardsBatch = req.body;

        let result : IFlashcardsBatch;
        try {
            logger.info('Batch');
            result = await flashcardService.handleBatchFlashcardsForTopic(topicId, { flashcardsAdded, flashcardsUpdated, flashcardsDeleted });
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.created(res, result);
    }

    public async handleUpdateSingleFlashcardForTopic(req: Request, res: Response): Promise<void> {
        const { flashcardUpdated } : { flashcardUpdated: IFlashcardUpdated } = req.body;

        let result : IBasicFlashcardReturned;
        try {
            result = await flashcardService.handleUpdateSingleFlashcardForTopic(flashcardUpdated);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.ok(res, result);
    } 

    public async handleGetFlashcardsPracticedForUser(req: Request, res: Response): Promise<void> {
        let { userId } = req.query as { userId: string | number };

        userId = parseInt(userId as string);

        if(isNaN(userId)) {
            logger.warn('userId is NaN');
            throw new BadRequest('Invalid param, cannot get flashcards');
        }

        // todo: check isExistedUser

        let flashcards : IFlashcardPracticed[];
        try {
            flashcards = await flashcardService.handleGetFlashcardsPracticedForUser(userId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        let flashcardsReturned : IFlashcardSuperMemo[] = await flashcardService.handleGetNextReviewIntervalsForAllQualityResponses(flashcards);

        SuccessResponse.ok(res, { flashcards: flashcardsReturned });
    }

    public async handlePutFlashcardToPractice(req: Request, res: Response): Promise<void> {
        let { flashcardId } = req.params as { flashcardId: string | number };
        
        flashcardId = parseInt(flashcardId as string);

        if(isNaN(flashcardId)) {
            logger.warn('flashcardId is NaN');
            throw new BadRequest('Invalid param, cannot set flashcard to practice');
        }

        let flashcardUpdated : { status?: string };
        try {
            flashcardUpdated = await flashcardService.handlePutFlashcardToPractice(flashcardId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.ok(res, { flashcardUpdated });
    }

    public async handleTrackSingleFlashcard(req: Request, res: Response): Promise<void> {
        let { flashcardId } = req.params as { flashcardId: string | number };
        const { qualityResponse } = req.body as { qualityResponse: IQualityResponse };

        flashcardId = parseInt(flashcardId as string);

        if(isNaN(flashcardId)) {
            logger.warn('flashcardId is NaN');
            throw new BadRequest('Invalid param, cannot track flashcard');
        }

        let flashcard;
        try {
            flashcard = await flashcardService.handleGetFlashcardProgress(flashcardId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        if(!flashcard) {
            throw new BadRequest('Flashcard is invalid');
        }
        const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
        const currentDate = new Date(Date.now());

        const superMemo2 = new SuperMemo2(easinessFactor!, reviewInterval!, repetitionNumber!, qualityResponse);
        const info = superMemo2.calc();

        let nextReview = SuperMemo2.getNextReview(currentDate, info.reviewInterval);

        let sm2Info : IFlashcardProgressUpdated = {
            repetitionNumber: info.repetitionNumber ,
            easinessFactor: info.easinessFactor,
            reviewInterval: info.reviewInterval,
            lastReviewed: currentDate,
            nextReview 
        }

        let flashcardUpdated : IFlashcardReturned;
        try {
            flashcardUpdated = await flashcardService.handleApplyFlashcardSM2(flashcardId, sm2Info);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong :((');
        }

        SuccessResponse.ok(res, { flashcardUpdated: flashcardUpdated });
    }

    // public async updateDate(req: Request, res: Response): Promise<void> {}
    // public async getDate(req: Request, res: Response): Promise<void> {}
}

export default FlashcardController;