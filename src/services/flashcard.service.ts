import flashcardRepo from "@/repositories/flashcard.repo";

const handleGetFlashcard = async(flashcardId: any) => {
    const flashcard = await flashcardRepo.handleGetFlashcardById(flashcardId);
    return flashcard;
}

const handleInsertFlashcard = async(flashcard: any) => {
    const createdFlashcard = await flashcardRepo.handleInsertFlashcard(flashcard);
    return createdFlashcard[0];
}

const handleUpdateFlashcard = async(flashcard: any) => {
    const updatedFlashcard = await flashcardRepo.handleUpdateFlashcard(flashcard);
    return updatedFlashcard[0];
}

const handleDeleteFlashcard = async(flashcardId: any) => {
    const deletedFlashcard = await flashcardRepo.handleDeleteFlashcardById(flashcardId);
    return deletedFlashcard[0];
}

const flashcardService = { handleGetFlashcard, handleInsertFlashcard, handleUpdateFlashcard, handleDeleteFlashcard };

export default flashcardService;