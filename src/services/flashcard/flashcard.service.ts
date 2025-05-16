import { flashcardsTable } from "@/models";
import FlashcardRepo from "@/repositories/flashcard.repo";
import { IBasicFlashcardReturned, IFlashcardAdded, IFlashcardDeleted, IFlashcardFieldsReturned, IFlashcardPracticed, IFlashcardProgressUpdated, IFlashcardReturned, IFlashcardsBatch, IFlashcardSuperMemo, IFlashcardUpdated } from "@/types/flashcard/flashcard.type";
import { IQualityResponse } from "../spaced-repetition-system/super-memo-2/superMemo2.origin.class.service";
import { getDateAdded } from "@/utils/date";
// import { sm2 } from "../spaced-repetition-system/super-memo-2/superMemo2.origin.service";
import SuperMemo2 from "../spaced-repetition-system/super-memo-2/superMemo2.origin.class.service";

const flashcardRepo = new FlashcardRepo();

class FlashcardService {
    constructor() {}

    public async handleGetFlashcardProgress(flashcardId: number) {
        const fieldsReturned : IFlashcardFieldsReturned = {
            flashcardId: flashcardsTable.flashcardId,
            reviewInterval: flashcardsTable.reviewInterval,
            easinessFactor: flashcardsTable.easinessFactor,
            repetitionNumber: flashcardsTable.repetitionNumber,
            lastReviewed: flashcardsTable.lastReviewed
        }
        const flashcard = await flashcardRepo.handleGetSingleFlashcard(flashcardId, fieldsReturned);
        return flashcard;
    }

    public async handleGetAllFlashcardsForTopic(topicId: number): Promise<(IBasicFlashcardReturned & { status: string })[]> {
        const flashcards = await flashcardRepo.handleGetAllFlashcardsForTopic(topicId);
        return flashcards;
    }

    public async handleInsertFlashcardsForTopic(topicId: number, flashcards: IFlashcardAdded[]): Promise<IBasicFlashcardReturned[]> {
        let flashcardsFormatted = flashcards.map((flashcard) => {
            return { topicId: topicId, front: flashcard.front, back: flashcard.back }
        });

        let flashcardsAdded = await flashcardRepo.handleInsertFlashcardsForTopic(flashcardsFormatted);
        return flashcardsAdded;
    }

    public async handleUpdateFlashcardsForTopic(flashcards: IFlashcardUpdated[]): Promise<IBasicFlashcardReturned[]> {
        const flashcardsUpdated = await flashcardRepo.handleUpdateFlashcardsForTopic(flashcards);
        return flashcardsUpdated;
    }

    public async handleUpdateSingleFlashcardForTopic(flashcard: IFlashcardUpdated): Promise<IBasicFlashcardReturned> {
        const flashcardUpdated = await flashcardRepo.handleUpdateSingleFlashcardForTopic(flashcard);
        return flashcardUpdated;
    }

    public async handleDeleteFlashcardsForTopic(flashcardsIds: IFlashcardDeleted[]): Promise<number[]> {
        let flashcardsDeleted = await flashcardRepo.handleDeleteFlashcardsForTopic(flashcardsIds);
        return flashcardsDeleted;
    }

    public async handleBatchFlashcardsForTopic(
        topicId: number,
        { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }:
        IFlashcardsBatch
    ):
    Promise<{ flashcardsAdded?: IBasicFlashcardReturned[], flashcardsUpdated?: IBasicFlashcardReturned[], flashcardsDeleted?: number[] }> {

        let flashcardsAddedReturned, flashcardsUpdatedReturned, flashcardsDeletedReturned;

        if(flashcardsAdded && flashcardsAdded.length > 0) {
            flashcardsAddedReturned = await this.handleInsertFlashcardsForTopic(topicId, flashcardsAdded);
        }

        if(flashcardsUpdated && flashcardsUpdated.length > 0) {
            flashcardsUpdatedReturned = await this.handleUpdateFlashcardsForTopic(flashcardsUpdated);
        }

        if(flashcardsDeleted && flashcardsDeleted.length > 0) {
            flashcardsDeletedReturned = await this.handleDeleteFlashcardsForTopic(flashcardsDeleted);
        }

        return {
            flashcardsAdded: flashcardsAddedReturned,
            flashcardsUpdated: flashcardsUpdatedReturned,
            flashcardsDeleted: flashcardsDeletedReturned
        };
    }

    public async handlePutFlashcardToPractice(flashcardId: number): Promise<{ status?: string }> {
        const currentDate = new Date(Date.now());
        const tommorow = getDateAdded(currentDate, 1);

        const infoUpdated : IFlashcardProgressUpdated = { status: 'practice', lastReviewed: currentDate, nextReview: tommorow };

        const fieldsReturned : IFlashcardFieldsReturned = {
            status: flashcardsTable.status,
        }

        const flashcardUpdated = await flashcardRepo.handleUpdateFlashcardProgress(flashcardId, infoUpdated, fieldsReturned);
        return flashcardUpdated;
    }

    public async handleApplyFlashcardSM2(flashcardId: number, sm2Info: IFlashcardProgressUpdated): Promise<IFlashcardReturned> {
        const fieldsReturned : IFlashcardFieldsReturned = {
            repetitionNumber: flashcardsTable.repetitionNumber,
            easinessFactor: flashcardsTable.easinessFactor,
            reviewInterval: flashcardsTable.reviewInterval,
            lastReviewed: flashcardsTable.lastReviewed,
            nextReview: flashcardsTable.nextReview
        }

        const flashcardUpdated = await flashcardRepo.handleUpdateFlashcardProgress(flashcardId, sm2Info, fieldsReturned);
        return flashcardUpdated;
    }

    public async handleGetFlashcardsPracticedForUser(userId: number): Promise<IFlashcardPracticed[]> {
        const currentDate = new Date(Date.now());
        const flashcards = await flashcardRepo.handleGetFlashcardsPracticedForUser(userId, currentDate);
        return flashcards;
    }

    public async handleGetNextReviewIntervalsForAllQualityResponses(flashcards: IFlashcardPracticed[]): Promise<IFlashcardSuperMemo[]> {
        let flashcardsReturned : IFlashcardSuperMemo[] = [];

        for(const flashcard of flashcards) {
            const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
            let qualityResponse = 0;
            let flashcardReturned : IFlashcardSuperMemo = {
                flashcardId: flashcard.flashcardId,
                topicId: flashcard.topicId,
                topicName: flashcard.topicName,
                front: flashcard.front,
                back: flashcard.back,
                status: flashcard.status,
                nextReview: flashcard.nextReview,
                qualityResponsesNextReviewInterval: []
            }
            for(; qualityResponse <= 5; ++qualityResponse) {
                const superMemo2 = new SuperMemo2(easinessFactor!, reviewInterval!, repetitionNumber!, qualityResponse as IQualityResponse);
                const info = superMemo2.calc();
                flashcardReturned.qualityResponsesNextReviewInterval?.push({
                    qualityResponse: qualityResponse as IQualityResponse,
                    nextReviewInterval: info.reviewInterval
                });
            }
            flashcardsReturned.push(flashcardReturned);
        }
        return flashcardsReturned;
    }
}

export default FlashcardService;