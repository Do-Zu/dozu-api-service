import db from '@/libs/drizzleClient.lib';
import { flashcardsTable } from '@/models';
import { IFlashcardAdded, IFlashcardDeleted, IFlashcardReturned, IFlashcardUpdated } from '@/types/flashcards/flashcard.type';
import { asc, eq } from 'drizzle-orm';

type IFlashcardAddedRepo = IFlashcardAdded & {
    topicId: number
}

const handleGetAllFlashcardsForTopic = async(topicId: number): Promise<IFlashcardReturned[]> => {
    const flashcards = await db
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
    return flashcards;
} 

const handleInsertFlashcardsForTopic = async(flashcards: IFlashcardAddedRepo[]) : Promise<IFlashcardReturned[]>  => {
    let flashcardsAdded = await db
            .insert(flashcardsTable)    
            .values(flashcards)
            .returning({ topicId: flashcardsTable.topicId, flashcardId: flashcardsTable.flashcardId, front: flashcardsTable.front, back: flashcardsTable.back });
    return flashcardsAdded;
}

const handleUpdateSingleFlashcardForTopic = async(flashcard: IFlashcardUpdated) : Promise<IFlashcardReturned> => {
    const { flashcardId, front, back } = flashcard;

    const flashcardsUpdated = await db
        .update(flashcardsTable)
        .set({ front, back })
        .where(eq(flashcardsTable.flashcardId, flashcardId))
        .returning({ topicId: flashcardsTable.topicId, flashcardId: flashcardsTable.flashcardId, front: flashcardsTable.front, back: flashcardsTable.back });

    return flashcardsUpdated[0];
}
const handleUpdateFlashcardsForTopic = async(flashcards: IFlashcardUpdated[]) : Promise<IFlashcardReturned[]> => {
    let flashcardsUpdated = [];

    for(const flashcard of flashcards) {
        const { flashcardId, front, back } = flashcard;

        const flashcardUpdated = await db
            .update(flashcardsTable)
            .set({ front, back })
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning({ topicId: flashcardsTable.topicId, flashcardId: flashcardsTable.flashcardId, front: flashcardsTable.front, back: flashcardsTable.back });
        flashcardsUpdated.push(...flashcardUpdated);
    }
    return flashcardsUpdated;
}

const handleDeleteFlashcardsForTopic = async(flashcardsIds: IFlashcardDeleted[]) => {
    let flashcardsDeleted : number[] = [];
    for(const flashcardId of flashcardsIds) {
        let flashcardDeleted = await db
            .delete(flashcardsTable)
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning({ flashcardId: flashcardsTable.flashcardId });
        flashcardsDeleted.push(flashcardDeleted[0].flashcardId);
    }
    return flashcardsDeleted;
}

const flashcardRepo = { handleGetAllFlashcardsForTopic, handleInsertFlashcardsForTopic, handleUpdateSingleFlashcardForTopic, handleUpdateFlashcardsForTopic, handleDeleteFlashcardsForTopic };

export default flashcardRepo;