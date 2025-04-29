import { BadRequest, DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import flashcardService from "@/services/flashcard/flashcard.service";
import topicService from "@/services/topic/topic.service";
import { IFlashcardAdded, IFlashcardsBatch, IFlashcardUpdated } from "@/types/flashcards/flashcard.type";
import logger from "@/utils/logger";
import { Request, Response } from "express";

const handleGetAllFlashcardsForTopic = async(req: Request, res: Response) => {
    let { topicId } = req.query as { topicId: string | number };
    if(!topicId) {
        throw new BadRequest('Invalid param, cannot get flashcards');
    }

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

const flashcardController = { handleUpdateSingleFlashcardForTopic, handleGetAllFlashcardsForTopic, handleInsertFlashcardsForTopic, handleBatchFlashcardsForTopic }

export default flashcardController;