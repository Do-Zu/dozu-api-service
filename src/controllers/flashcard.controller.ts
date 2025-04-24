import { BadRequest, DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import { Request, Response } from "express";
import db from '@/libs/drizzleClient.lib';
import { topicsTable, usersTable } from "@/models";
import flashcardService from "@/services/flashcard.service";
import topicService from "@/services/topic.service";
import logger from "@/utils/logger";

export const handleInsertExampleUser = async(req: Request, res: Response) => {
    const { username, email, passwordHash } = req.body;
    const user = await db.insert(usersTable).values({ username, email, passwordHash });
    
    SuccessResponse.ok(res, { user });
}

export const handleInsertExampleTopic = async(req: Request, res: Response) => {
    const { userId, name } = req.body;
    const topic = await db.insert(topicsTable).values({ userId, name });
    SuccessResponse.ok(res, { topic });
}

export const handleGetFlashcardController = async(req: Request, res: Response) => {
    const { flashcardId } = req.body;

    // data validation
    if(!flashcardId) {
        throw new BadRequest('Invalid input, cannot get flashcard');
    }

    // get flashcard
    let flashcard;
    try {
        flashcard = await flashcardService.handleGetFlashcard(flashcardId);
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot get flashcard');
    }

    // kiểm tra flashcardId có tồn tại không 
    if(!flashcard) {
        throw new BadRequest('Invalid flashcard');
    }

    SuccessResponse.ok(res, { flashcard: { front: flashcard.front, back: flashcard.back } });
}

export const handleInsertFlashcardController = async(req: Request, res: Response) => {
    const { topicId, front, back } = req.body;
    
    // data validation
    if(!topicId || !front || !back) {
        throw new BadRequest('Invalid input, cannot create flashcard');
    }

    // validate topicId 
    // return undefined nếu ko tìm thấy
    const isExistedTopic = await topicService.handleIsExistedTopic(topicId);

    if(!isExistedTopic) {
        throw new BadRequest('Invalid topic');
    }
    // end validate topicId

    // create flashcard
    try {
        const flashcard = await flashcardService.handleInsertFlashcard({ topicId, front, back });
        SuccessResponse.created(res, { flashcard: { front: flashcard.front, back: flashcard.back } });
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot create flashcard');
    }
    // end create flashcard
}

export const handleUpdateFlashcardController = async(req: Request, res: Response) => {
    const { flashcardId, topicId, front, back } = req.body;

    // data validation
    if(!flashcardId || !front || !back) {
        throw new BadRequest('Invalid input, cannot create flashcard');
    }

    // validate topicId 
    // return undefined nếu ko tìm thấy

    // end validate topicId

    // update flashcard
    let flashcard;
    try {
        flashcard = await flashcardService.handleUpdateFlashcard({ flashcardId, front, back });
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot update flashcard');
    }
    // end update flashcard

    // kiểm tra flashcardId có tồn tại không
    if(!flashcard) {
        throw new BadRequest('Invalid flashcard');
    }
    SuccessResponse.ok(res, { flashcard: { front: flashcard.front, back: flashcard.back } });
}

export const handleDeleteFlashcardController = async(req: Request, res: Response) => {
    const { flashcardId } = req.body;

    // data validation
    if(!flashcardId) {
        throw new BadRequest('Invalid input, cannot delete flashcard');
    }

    // delete flashcard
    let flashcard;
    try {
        flashcard = await flashcardService.handleDeleteFlashcard(flashcardId);
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot delete flashcard');
    }

    // kiểm tra flashcardId có tồn tại không
    if(!flashcard) {
        throw new BadRequest('Invalid flashcard');
    }

    SuccessResponse.noContent(res);
}