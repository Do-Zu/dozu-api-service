import requestHelper from '@/core/request/request.helper';
import { SuccessResponse } from '@/core/success';
import flashcardService from '@/services/flashcard/v2/flashcard.service';
import { InsertFlashcardsBody, IUpdateFlashcardsBody } from '@/types/flashcard/flashcard.type';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentTimestampFromRequest } from '@/utils/date';
import { Request, Response } from 'express';

class FlashcardController {
    public async createFlashcardsForTopic(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const userId = getUserIdFromRequest(req);
        const insertedFlashcards = req.body.flashcards as InsertFlashcardsBody;
        const result = await flashcardService.createFlashcardsForTopic(topicId, {
            userId,
            flashcards: insertedFlashcards,
        });
        SuccessResponse.created(res, result);
    }

    public async updateFlashcardsInTopic(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const updatedFlashcards = req.body.flashcards as IUpdateFlashcardsBody;
        const result = await flashcardService.updateFlashcardsInTopic(topicId, updatedFlashcards);
        SuccessResponse.ok(res, result);
    }

    public async deleteFlashcardsInTopic(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const deletedFlashcardIds = req.body.flashcards as number[];
        const result = await flashcardService.deleteFlashcardsInTopic(topicId, deletedFlashcardIds);
        SuccessResponse.ok(res, result);
    }

    public async getDueAnkiCardsForTopic(req: Request, res: Response) {
        const currentTimestamp = getCurrentTimestampFromRequest(req);
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        const result = await flashcardService.getDueAnkiCardsForTopicAndUser(topicId, userId, currentTimestamp);
        SuccessResponse.ok(res, result);
    }
}

export default new FlashcardController();
