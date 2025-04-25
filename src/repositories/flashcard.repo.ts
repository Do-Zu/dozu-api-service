import db from '@/libs/drizzleClient.lib';
import { flashcardsTable } from '@/models';
import logger from '@/utils/logger';
import { eq } from 'drizzle-orm';

const handleGetFlashcardById = async(flashcardId: any) => {
    const flashcard = await db.query.flashcardsTable
        .findFirst({ where: eq(flashcardsTable.flashcardId, flashcardId) });
    return flashcard;
}

const handleInsertFlashcard = async(flashcard: any) => {
    const createdFlashcard = await db.insert(flashcardsTable).values(flashcard).returning();
    return createdFlashcard;
}

const handleUpdateFlashcard = async(flashcard: any) => {
    const { flashcardId, front, back } = flashcard;
    const updatedFlashcard = await db
        .update(flashcardsTable)
        .set({ front, back })
        .where(eq(flashcardsTable.flashcardId, flashcardId))
        .returning();
    return updatedFlashcard;
}

const handleDeleteFlashcardById = async(flashcardId: any) => {
    const deletedFlashcard = await db.delete(flashcardsTable).where(eq(flashcardsTable.flashcardId, flashcardId)).returning();
    return deletedFlashcard;
}

const flashcardRepo = { handleGetFlashcardById, handleInsertFlashcard, handleUpdateFlashcard, handleDeleteFlashcardById };

export default flashcardRepo;