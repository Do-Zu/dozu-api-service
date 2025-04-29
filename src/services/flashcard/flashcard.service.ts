import flashcardRepo from "@/repositories/flashcard.repo";
import { IFlashcardAdded, IFlashcardDeleted, IFlashcardUpdated } from "@/types/flashcards/flashcard.type";

interface IFlashcardReturned {
    topicId: number,
    flashcardId: number,
    front: string,
    back: string
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

const flashcardService = { handleGetAllFlashcardsForTopic, handleUpdateSingleFlashcardForTopic, handleBatchFlashcardsForTopic, handleInsertFlashcardsForTopic, handleUpdateFlashcardsForTopic, handleDeleteFlashcardsForTopic };

export default flashcardService;