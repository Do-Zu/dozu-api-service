import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, topicsTable, usersTable } from '@/models';
import { IFlashcardAdded, IFlashcardDeleted, IFlashcardFieldsReturned, IFlashcardPracticed, IFlashcardProgressUpdated, IBasicFlashcardReturned, IFlashcardUpdated, IFlashcardReturned } from '@/types/flashcard/flashcard.type';
import { getDateFormatted } from '@/utils/date';
import { and, asc, eq, lte, ne } from 'drizzle-orm';

type IFlashcardAddedRepo = IFlashcardAdded & {
    topicId: number
}

class FlashcardRepo {
    constructor() {}

    public async handleGetSingleFlashcard(flashcardId: number, fieldsReturned: IFlashcardFieldsReturned) {
        const flashcards = await db
            .select(fieldsReturned)
            .from(flashcardsTable)
            .where(eq(flashcardsTable.flashcardId, flashcardId));
        return flashcards[0];
    }

    public async handleGetFlashcardsPracticedForUser(userId: number, currentDate: Date) : Promise<IFlashcardPracticed[]> {
        const flashcards = await db
            .select({
                flashcardId: flashcardsTable.flashcardId,
                topicId: topicsTable.topicId,
                topicName: topicsTable.name,
                front: flashcardsTable.front,
                back: flashcardsTable.back,
                status: flashcardsTable.status,
                nextReview: flashcardsTable.nextReview,

                // extra selection for calculating next time review
                reviewInterval: flashcardsTable.reviewInterval,
                easinessFactor: flashcardsTable.easinessFactor,
                repetitionNumber: flashcardsTable.repetitionNumber,
                
            })
            .from(flashcardsTable)
            .innerJoin(topicsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
            .innerJoin(usersTable, eq(topicsTable.userId, usersTable.userId))
            .where(
                and(
                    eq(usersTable.userId, userId),
                    ne(flashcardsTable.status, 'new'),
                    lte(flashcardsTable.nextReview, getDateFormatted(currentDate))
                )
            )
            .orderBy(asc(flashcardsTable.nextReview));

        return flashcards;
    }

    public async handleGetAllFlashcardsForTopic(topicId: number): Promise<(IBasicFlashcardReturned & { status: string })[]> {
        const flashcards = await db
            .query
            .flashcardsTable
            .findMany({
                where: eq(flashcardsTable.topicId, topicId),
                columns: {
                    flashcardId: true,
                    topicId: true,
                    front: true,
                    back: true,
                    status: true,
                },
                orderBy: [asc(flashcardsTable.flashcardId)]
            });
        return flashcards;
    } 

    public async handleInsertFlashcardsForTopic(flashcards: IFlashcardAddedRepo[]) : Promise<IBasicFlashcardReturned[]> {
        let flashcardsAdded = await db
                .insert(flashcardsTable)    
                .values(flashcards)
                .returning({ 
                    topicId: flashcardsTable.topicId, 
                    flashcardId: flashcardsTable.flashcardId, 
                    front: flashcardsTable.front, 
                    back: flashcardsTable.back 
                });
        return flashcardsAdded;
    }

    public async handleUpdateSingleFlashcardForTopic(flashcard: IFlashcardUpdated) : Promise<IBasicFlashcardReturned> {
        const { flashcardId, front, back } = flashcard;

        const flashcardsUpdated = await db
            .update(flashcardsTable)
            .set({ front, back })
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning({ 
                topicId: flashcardsTable.topicId, 
                flashcardId: flashcardsTable.flashcardId, 
                front: flashcardsTable.front, 
                back: flashcardsTable.back
            });

        return flashcardsUpdated[0];
    }

    public async handleUpdateFlashcardsForTopic(flashcards: IFlashcardUpdated[]) : Promise<IBasicFlashcardReturned[]> {
        let flashcardsUpdated = [];

        for(const flashcard of flashcards) {
            const { flashcardId, front, back } = flashcard;

            const flashcardUpdated = await db
                .update(flashcardsTable)
                .set({ front, back })
                .where(eq(flashcardsTable.flashcardId, flashcardId))
                .returning({ 
                    topicId: flashcardsTable.topicId, 
                    flashcardId: flashcardsTable.flashcardId, 
                    front: flashcardsTable.front, 
                    back: flashcardsTable.back 
                });
            flashcardsUpdated.push(...flashcardUpdated);
        }
        return flashcardsUpdated;
    }
    
    public async handleDeleteFlashcardsForTopic(flashcardsIds: IFlashcardDeleted[]) : Promise<number[]> {
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

    public async handleUpdateFlashcardProgress(
        flashcardId: number, 
        infoUpdated: IFlashcardProgressUpdated, 
        fieldsReturned: IFlashcardFieldsReturned
    ) : Promise<IFlashcardReturned> {
        let { repetitionNumber, easinessFactor, reviewInterval, lastReviewed, nextReview, status } = infoUpdated;

        if(easinessFactor !== undefined && typeof easinessFactor === 'number') easinessFactor = easinessFactor.toPrecision(3);
        if(lastReviewed && typeof lastReviewed !== 'string') lastReviewed = getDateFormatted(lastReviewed);
        if(nextReview && typeof nextReview !== 'string') nextReview = getDateFormatted(nextReview);

        const infoUpdatedFormatted = { repetitionNumber, easinessFactor, reviewInterval, lastReviewed, nextReview, status };

        const flashcardsUpdated = await db  
            .update(flashcardsTable)
            .set(infoUpdatedFormatted)
            .where(eq(flashcardsTable.flashcardId, flashcardId))
            .returning(fieldsReturned)
        
        return flashcardsUpdated[0];
    }
}

export default FlashcardRepo;