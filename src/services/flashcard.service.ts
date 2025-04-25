import { flashcardsTable } from "@/models";
import flashcardRepo from "@/repositories/flashcard.repo";
import { IFlashcardAdded, IFlashcardUpdated } from "@/types/flashcards/flashcard.type";
import db from '@/libs/drizzleClient.lib';
import { asc, eq } from "drizzle-orm";

interface IFlashcardReturned {
    topicId: number,
    flashcardId: number,
    front: string,
    back: string
}

const handleGetAllFlashcardsForTopic = async(topicId: number) : Promise<IFlashcardReturned[]> => {
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

const handleBatchFlashcardsForTopic = async(topicId: number, 
    { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: { flashcardsAdded?: IFlashcardAdded[], flashcardsUpdated?: IFlashcardUpdated[], flashcardsDeleted?: number[] }
    ) => {
    
    if(flashcardsAdded) {
        const flashcardsAddedResult = await handleInsertFlashcardsForTopic(topicId, flashcardsAdded);
        return { flashcardsAdded: flashcardsAddedResult };
    }

    return null;
}

const handleInsertFlashcardsForTopic = async(topicId: number, flashcards: IFlashcardAdded[]) : Promise<IFlashcardReturned[]>  => {

    let flashcardsFormatted = flashcards.map((flashcard) => {
        return { topicId: topicId, front: flashcard.front, back: flashcard.back }
    })

    let flashcardsAdded =  await db
            .insert(flashcardsTable)    
            .values(flashcardsFormatted)
            .returning({ topicId: flashcardsTable.topicId, flashcardId: flashcardsTable.flashcardId, front: flashcardsTable.front, back: flashcardsTable.back });
    return flashcardsAdded;
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

const handleDeleteFlashcardsForTopic = async(flashcardsIds: number[]) => {
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

// const handleDeleteAllFlashcardsForTopic = async(topicId: number) : Promise<void> => {
//     await db
//         .delete(flashcardsTable)
//         .where(eq(flashcardsTable.topicId, topicId))
//         .returning({ flashcardId: flashcardsTable.flashcardId });
// }

const flashcardService = { handleGetAllFlashcardsForTopic, handleBatchFlashcardsForTopic, handleInsertFlashcardsForTopic, handleUpdateFlashcardsForTopic, handleDeleteFlashcardsForTopic };

export default flashcardService;