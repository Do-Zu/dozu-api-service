import { flashcardsTable } from "@/models";
import flashcardRepo from "@/repositories/flashcard.repo";
import { IFlashcardAdded, IFlashcardDeleted, IFlashcardFieldsReturned, IFlashcardPracticed, IFlashcardProgressUpdated, IFlashcardUpdated } from "@/types/flashcard/flashcard.type";
import { IQualityResponse } from "../spaced-repetition-system/super-memo-2/superMemo2.origin.class.service"; 
import { getDateAdded } from "@/utils/date";
import { sm2 } from "../spaced-repetition-system/super-memo-2/superMemo2.origin.service";
import SuperMemo2 from "../spaced-repetition-system/super-memo-2/superMemo2.origin.class.service";

interface IFlashcardReturned {
    topicId: number,
    flashcardId: number,
    front: string,
    back: string
}

interface IQualityResponseNextReviewInterval {
    qualityResponse: IQualityResponse
    nextReviewInterval: number
}

interface IFlashcardExtended extends IFlashcardReturned {
    topicName?: string
    status: string | null
    nextReview?: string | null
    qualityResponsesNextReviewInterval?: IQualityResponseNextReviewInterval[]
}

const handleGetFlashcardProgress = async(flashcardId: number) => {
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

const handleGetAllFlashcardsForTopic = async(topicId: number) : Promise<IFlashcardReturned[]> => {
    const flashcards = await flashcardRepo.handleGetAllFlashcardsForTopic(topicId);
    return flashcards;
}

const handleInsertFlashcardsForTopic = async(topicId: number, flashcards: IFlashcardAdded[]) : Promise<IFlashcardReturned[]>  => {

    let flashcardsFormatted = flashcards.map((flashcard) => {
        return { topicId: topicId, front: flashcard.front, back: flashcard.back }
    })

    let flashcardsAdded = await flashcardRepo.handleInsertFlashcardsForTopic(flashcardsFormatted);
    return flashcardsAdded;
}

const handleUpdateFlashcardsForTopic = async(flashcards: IFlashcardUpdated[]) : Promise<IFlashcardReturned[]> => {
    const flashcardsUpdated = await flashcardRepo.handleUpdateFlashcardsForTopic(flashcards);
    return flashcardsUpdated;
}

const handleUpdateSingleFlashcardForTopic = async(flashcard: IFlashcardUpdated) : Promise<IFlashcardReturned> => {
    const flashcardUpdated = await flashcardRepo.handleUpdateSingleFlashcardForTopic(flashcard);
    return flashcardUpdated;
}

const handleDeleteFlashcardsForTopic = async(flashcardsIds: IFlashcardDeleted[]) : Promise<number[]> => {
    let flashcardsDeleted = flashcardRepo.handleDeleteFlashcardsForTopic(flashcardsIds);
    return flashcardsDeleted;
}

const handleBatchFlashcardsForTopic = async(topicId: number, 
    { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: { flashcardsAdded?: IFlashcardAdded[], flashcardsUpdated?: IFlashcardUpdated[], flashcardsDeleted?: number[] }
    ) => {

    let flashcardsAddedReturned, flashcardsUpdatedReturned, flashcardsDeletedReturned;
    
    if(flashcardsAdded && flashcardsAdded.length > 0) {
        flashcardsAddedReturned = await handleInsertFlashcardsForTopic(topicId, flashcardsAdded);
    }

    if(flashcardsUpdated && flashcardsUpdated.length > 0) {
        flashcardsUpdatedReturned = await handleUpdateFlashcardsForTopic(flashcardsUpdated);
    }

    if(flashcardsDeleted && flashcardsDeleted.length > 0) {
        flashcardsDeletedReturned = await handleDeleteFlashcardsForTopic(flashcardsDeleted);
    }

    return { 
        flashcardsAdded: flashcardsAddedReturned, 
        flashcardsUpdated: flashcardsUpdatedReturned,
        flashcardsDeleted: flashcardsDeletedReturned
    };
}

const handlePutFlashcardToPractice = async(flashcardId: number) => {
    const currentDate = new Date(Date.now());
    const tommorow = getDateAdded(currentDate, 1);

    const infoUpdated : IFlashcardProgressUpdated = { status: 'practice', lastReviewed: currentDate, nextReview: tommorow };

    const fieldsReturned : IFlashcardFieldsReturned = {
        topicId: flashcardsTable.topicId,
        flashcardId: flashcardsTable.flashcardId,
        status: flashcardsTable.status,
        // lastReviewed: flashcardsTable.lastReviewed,
        // nextReview: flashcardsTable.nextReview
    }

    const flashcardUpdated = await flashcardRepo.handleUpdateFlashcardProgress(flashcardId, infoUpdated, fieldsReturned);
    return flashcardUpdated;
}

const handleApplyFlashcardSM2 = async(flashcardId: number, sm2Info: IFlashcardProgressUpdated) => {
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

const handleGetFlashcardsPracticedForUser = async(userId: number) => {
    const currentDate = new Date(Date.now());
    const flashcards = await flashcardRepo.handleGetFlashcardsPracticedForUser(userId, currentDate);
    return flashcards;
}

const handleGetNextReviewIntervalsForAllQualityResponses = async(flashcards: IFlashcardPracticed[]) : Promise<IFlashcardExtended[]> => {
    let flashcardsReturned : IFlashcardExtended[] = [];

    for(const flashcard of flashcards) {
        const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
        let qualityResponse = 0;
        let flashcardReturned : IFlashcardExtended = {
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
            // const info = sm2({ 
            //     reviewInterval: reviewInterval!, 
            //     easinessFactor: easinessFactor!, 
            //     repetitionNumber: repetitionNumber!, 
            //     qualityResponse: qualityResponse as IQualityResponse 
            // });

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

const flashcardService = { 
    handleGetAllFlashcardsForTopic, 
    handleUpdateSingleFlashcardForTopic, 
    handleBatchFlashcardsForTopic, 
    handleInsertFlashcardsForTopic, 
    handleUpdateFlashcardsForTopic, 
    handleDeleteFlashcardsForTopic,

    handleGetFlashcardProgress,

    handlePutFlashcardToPractice,
    handleApplyFlashcardSM2,
    handleGetFlashcardsPracticedForUser,

    handleGetNextReviewIntervalsForAllQualityResponses
};

export default flashcardService;