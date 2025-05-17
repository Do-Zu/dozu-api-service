import { BadRequest, DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import flashcardService from "@/services/flashcard/flashcard.service";
import topicService from "@/services/topic/topic.service";
import { IFlashcardAdded, IFlashcardProgressUpdated, IFlashcardReturned, IFlashcardsBatch, IFlashcardTracked, IFlashcardUpdated } from "@/types/flashcard/flashcard.type";
import logger from "@/utils/logger";
import { Request, Response } from "express";
import { getNextReview, sm2 } from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin.service';
import SuperMemo2, { IQualityResponse } from "@/services/spaced-repetition-system/super-memo-2/superMemo2.origin.class.service";

const handleGetAllFlashcardsForTopic = async(req: Request, res: Response) => {
    let { topicId } = req.query as { topicId: string | number };

    topicId = parseInt(topicId as string);
    
    if(isNaN(topicId)) {
        throw new BadRequest('Invalid param, cannot get flashcards');
    }

    const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
    if(!isExistedTopic) {
        throw new BadRequest('Invalid topic');
    }

    let flashcards;
    try {
        flashcards = await flashcardService.handleGetAllFlashcardsForTopic(topicId);
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot get flashcards');
    }
    SuccessResponse.ok(res, { flashcards });
}

const handleInsertFlashcardsForTopic = async(req: Request, res: Response) => {
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
    let result;
    try {
        result = await flashcardService.handleInsertFlashcardsForTopic(topicId, flashcards);
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot create flashcards');
    }

    SuccessResponse.ok(res, { flashcards: result });
}

const handleBatchFlashcardsForTopic = async(req: Request, res: Response) => {
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

    let result;
    try {
        logger.info('Batch');
        result = await flashcardService.handleBatchFlashcardsForTopic(topicId, { flashcardsAdded, flashcardsUpdated, flashcardsDeleted });
    } catch(err) {
        throw new DatabaseError('Something went wrong :((');
    }

    SuccessResponse.created(res, result);
}

const handleUpdateSingleFlashcardForTopic = async(req: Request, res: Response) => {
    const { flashcardUpdated } : { flashcardUpdated: IFlashcardUpdated } = req.body;

    let result;
    try {
        result = await flashcardService.handleUpdateSingleFlashcardForTopic(flashcardUpdated);
    } catch(err) {
        throw new DatabaseError('Something went wrong :((');
    }

    SuccessResponse.ok(res, result);
} 

const handleGetFlashcardsPracticed = async(req: Request, res: Response) => {
    let { userId } = req.query as { userId: string | number };

    userId = parseInt(userId as string);

    if(isNaN(userId)) {
        logger.warn('userId is NaN');
        throw new BadRequest('Invalid param, cannot get flashcards');
    }

    // todo: check isExistedUser

    let flashcards;
    try {
        flashcards = await flashcardService.handleGetFlashcardsPracticedForUser(userId);
        // logger.info(flashcards);
    } catch(err) {
        throw new DatabaseError('Something went wrong :((');
    }

    let flashcardsReturned = await flashcardService.handleGetNextReviewIntervalsForAllQualityResponses(flashcards);
    // logger.info(flashcardsReturned);

    SuccessResponse.ok(res, { flashcards: flashcardsReturned });
}

const handlePutFlashcardToPractice = async(req: Request, res: Response) => {
    let { flashcardId } = req.params as { flashcardId: string | number };
    
    flashcardId = parseInt(flashcardId as string);

    if(isNaN(flashcardId)) {
        logger.warn('flashcardId is NaN');
        throw new BadRequest('Invalid param, cannot set flashcard to practice');
    }

    let flashcardsUpdated;
    try {
        flashcardsUpdated = await flashcardService.handlePutFlashcardToPractice(flashcardId);
        // logger.info(flashcardsUpdated);
    } catch(err) {
        throw new DatabaseError('Something went wrong :((');
    }

    SuccessResponse.ok(res, { flashcardUpdated: flashcardsUpdated[0] });
}

const handleTrackSingleFlashcard = async(req: Request, res: Response) => {
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
        throw new DatabaseError('Something went wrong :((');
    }

    if(!flashcard) {
        throw new BadRequest('Flashcard is invalid');
    }
    const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
    const currentDate = new Date(Date.now());

    // const info = sm2({ 
    //     reviewInterval: reviewInterval!, 
    //     easinessFactor: parseFloat(easinessFactor!), 
    //     qualityResponse, 
    //     repetitionNumber: repetitionNumber! 
    // });

    const superMemo2 = new SuperMemo2(easinessFactor!, reviewInterval!, repetitionNumber!, qualityResponse);
    const info = superMemo2.calc();

    // let nextReview = getNextReview(currentDate, info.reviewInterval);
    let nextReview = SuperMemo2.getNextReview(currentDate, info.reviewInterval);

    let sm2Info : IFlashcardProgressUpdated = {
        repetitionNumber: info.repetitionNumber ,
        easinessFactor: info.easinessFactor,
        reviewInterval: info.reviewInterval,
        lastReviewed: currentDate,
        nextReview 
    }
    // logger.info(sm2Info);

    let flashcardsUpdated;
    try {
        flashcardsUpdated = await flashcardService.handleApplyFlashcardSM2(flashcardId, sm2Info);
        // logger.info(flashcardsUpdated);
    } catch(err) {
        throw new DatabaseError('Something went wrong :((');
    }

    // logger.info(flashcardsUpdated[0]);
    SuccessResponse.ok(res, { flashcardUpdated: flashcardsUpdated[0] });
}

export const updateDate = async(req: Request, res: Response) => {}
export const getDate = async(req: Request, res: Response) => {}

const flashcardController = { 
    handleUpdateSingleFlashcardForTopic, 
    handleGetAllFlashcardsForTopic, 
    handleInsertFlashcardsForTopic, 
    handleBatchFlashcardsForTopic,

    handleGetFlashcardsPracticed,
    handlePutFlashcardToPractice,
    handleTrackSingleFlashcard
}

export default flashcardController;


