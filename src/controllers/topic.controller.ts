import { SuccessResponse } from "@/core/success";
import logger from "@/utils/logger";
import { Request, Response } from "express";
import db from '@/libs/drizzleClient.lib';
import { asc, eq } from "drizzle-orm";
import { flashcardsTable } from "@/models";
import { BadRequest } from "@/core/error";
import { DatabaseError } from "@/core/error";
import topicService from "@/services/topic.service";

interface IBasicCreatedFlashcard {
    topicId: number,
    front: string,
    back: string
}

interface IBasicUpdatedFlashcard {
    flashcardId: number,
    front: string,
    back: string
}

export const handleGetAllFlashcardsController = async(req: Request, res: Response) => {
    let { topicId } = req.params as { topicId: string | number };
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
        flashcards = await db
            .query
            .flashcardsTable
            .findMany({
                where: eq(flashcardsTable.topicId, topicId),
                columns: {
                    flashcardId: true,
                    topicId: true,
                    front: true,
                    back: true
                },
                orderBy: [asc(flashcardsTable.flashcardId)]
            });
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot get flashcards');
    }

    logger.info(flashcards);

    SuccessResponse.ok(res, { flashcards });
}

export const handleInsertOneFlashcardByTopicIdController = async(req: Request, res: Response) => {
    // let { topicId } = req.params as { topicId: string | number };
    // if(!topicId) {
    //     throw new BadRequest('Invalid param, cannot get flashcards');
    // }

    // topicId = parseInt(topicId as string);
    
    // if(isNaN(topicId)) {
    //     throw new BadRequest('Invalid param, cannot get flashcards');
    // }
}

export const handleUpdateOneFlashcardController = async(req: Request, res: Response) => {
    let { topicId, flashcardId } = req.params as { topicId: string | number, flashcardId: string | number };
    const { front, back } = req.body as { front: string, back: string };
    if(!topicId || !flashcardId || !front || !back) {
        throw new BadRequest('Invalid param, cannot update flashcard');
    }

    topicId = parseInt(topicId as string);
    flashcardId = parseInt(flashcardId as string);
    
    if(isNaN(topicId) || isNaN(flashcardId)) {
        throw new BadRequest('Invalid param, cannot update flashcard');
    }

    const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
    if(!isExistedTopic) {
        throw new BadRequest('Invalid topic');
    }

    const isFlashcardBelongedToTopic = await topicService.handleIsFlashcardBelongedToTopic(flashcardId, topicId);
    if(!isFlashcardBelongedToTopic) {
        throw new BadRequest('Invalid flashcard and topic');
    }

    let updatedFlashcard;
    try {
        const updatedFlashcards = await db
            .update(flashcardsTable)
            .set({ front, back })
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning();
        updatedFlashcard = updatedFlashcards[0];

    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot update flashcard');
    }

    if(!updatedFlashcard) {
        throw new BadRequest('Invalid flashcard');
    }

    SuccessResponse.ok(res, { updatedFlashcard: { front: updatedFlashcard.front, back: updatedFlashcard.back } });
}

export const handleDeleteOneFlashcardController = async(req: Request, res: Response) => {
    let { topicId, flashcardId } = req.params as { topicId: string | number, flashcardId: string | number };
    if(!topicId || !flashcardId) {
        throw new BadRequest('Invalid param, cannot delete flashcard');
    }

    topicId = parseInt(topicId as string);
    flashcardId = parseInt(flashcardId as string);
    
    if(isNaN(topicId) || isNaN(flashcardId)) {
        throw new BadRequest('Invalid param, cannot delete flashcard');
    }

    const isExistedTopic = await topicService.handleIsExistedTopic(topicId);
    if(!isExistedTopic) {
        throw new BadRequest('Invalid topic');
    }

    const isFlashcardBelongedToTopic = await topicService.handleIsFlashcardBelongedToTopic(flashcardId, topicId);
    if(!isFlashcardBelongedToTopic) {
        throw new BadRequest('Invalid flashcard and topic');
    }

    let deletedFlashcard;
    try {
        const deletedFlashcards = await db
            .delete(flashcardsTable)
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning({
                flashcardId: flashcardsTable.flashcardId
            });
        deletedFlashcard = deletedFlashcards[0];
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot delete flashcard');
    }

    if(!deletedFlashcard) {
        throw new BadRequest('Invalid flashcard');
    }

    SuccessResponse.noContent(res);
}

export const handleInsertManyFlashcardsController = async(req: Request, res: Response) => {
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

    let { flashcards } = req.body as { flashcards: IBasicCreatedFlashcard[] };
    
    flashcards = flashcards.map((flashcard) => { return { topicId, front: flashcard.front, back: flashcard.back } });
    
    let createdFlashcards;
    try {
        createdFlashcards = await db
            .insert(flashcardsTable)    
            .values(flashcards)
            .returning({ flashcardId: flashcardsTable.flashcardId, front: flashcardsTable.front, back: flashcardsTable.back });
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot create flashcards');
    }

    SuccessResponse.ok(res, { createdFlashcards });
}

export const handleUpdateManyFlashcardsController = async(req: Request, res: Response) => {
    let { topicId } = req.params as { topicId: string | number };
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

    const { flashcards } = req.body as { flashcards: IBasicUpdatedFlashcard[] };
    let updatedFlashcards = [];

    for(const flashcard of flashcards) {
        const { flashcardId, front, back } = flashcard;
        if(!flashcardId || !front || !back) {
            throw new BadRequest('Invalid data, cannot update flashcard');
        }

        const isFlashcardBelongedToTopic = await topicService.handleIsFlashcardBelongedToTopic(flashcardId, topicId);
        if(!isFlashcardBelongedToTopic) {
            throw new BadRequest('Invalid flashcard and topic');
        }
    }

    for(const flashcard of flashcards) {
        const { flashcardId, front, back } = flashcard;

        const updatedFlashcard = await db
            .update(flashcardsTable)
            .set({ front, back })
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning({ topicId: flashcardsTable.topicId, flashcardId: flashcardsTable.flashcardId, front: flashcardsTable.front, back: flashcardsTable.back });
        updatedFlashcards.push(updatedFlashcard);
    }

    logger.info(updatedFlashcards);

    SuccessResponse.ok(res, { updatedFlashcards });
}

export const handleDeleteAllFlashcardsController = async(req: Request, res: Response) => {
    let { topicId } = req.params as { topicId: string | number };
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

    let deletedFlashcards;
    try {
        deletedFlashcards = await db
            .delete(flashcardsTable)
            .where(eq(flashcardsTable.topicId, topicId))
            .returning({ flashcardId: flashcardsTable.flashcardId });
    } catch(err) {
        logger.error(err);
        throw new DatabaseError('Something went wrong, cannot delete flashcards');
    }

    SuccessResponse.noContent(res);
}