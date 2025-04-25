import { BadRequest, DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import flashcardService from "@/services/flashcard.service";
import topicService from "@/services/topic.service";
import { IFlashcardAdded } from "@/types/flashcards/flashcard.type";
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
    let { topicId } = req.params as { topicId: string | number };
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

    const { flashcardsAdded, flashcardUpdated, flashcardDeleted } = req.body;

    const result = await flashcardService.handleBatchFlashcardsForTopic(topicId, { flashcardsAdded });

    SuccessResponse.created(res, { flashcardsAdded: result?.flashcardsAdded });
}

const flashcardController = { handleGetAllFlashcardsForTopic, handleInsertFlashcardsForTopic, handleBatchFlashcardsForTopic }

export default flashcardController;