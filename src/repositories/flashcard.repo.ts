import db, { Transaction } from '@/libs/drizzleClient.lib';
import { flashcardsTable, itemSpacedRepetitionTrackingTable, topicsTable } from '@/models';
import { IFlashcardLearningState, IFlashcard } from '@/types/flashcard/flashcard.type';
import { and, asc, eq, lte } from 'drizzle-orm';
import itemSpacedRepetitionTrackingService from '@/services/tracking/itemSpacedRepetitionTracking.service';

type IInsertFlashcard = Pick<IFlashcard, 'topicId' | 'front' | 'back'>;
type IUpdateFlashcard = Pick<IFlashcard, 'flashcardId' | 'front' | 'back'>;

export type ICreateFlashcardRepo = Pick<IFlashcard, 'topicId' | 'front' | 'back'> & { imageUrl?: string | null };
export type IUpdateFlashcardRepo = Pick<IFlashcard, 'flashcardId' | 'front' | 'back'> & { imageUrl?: string | null };

class FlashcardRepo {
    constructor() {}

    public async getSpacedRepetitionDataForFlashcard(flashcardId: number): Promise<IFlashcardLearningState> {
        const flashcards = await db
            .select({
                flashcardId: itemSpacedRepetitionTrackingTable.itemId,
                status: itemSpacedRepetitionTrackingTable.status,
                lastReviewed: itemSpacedRepetitionTrackingTable.lastReviewed,
                nextReview: itemSpacedRepetitionTrackingTable.nextReview,
                reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
                easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
                repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
                step: itemSpacedRepetitionTrackingTable.step,
            })
            .from(flashcardsTable)
            .innerJoin(
                itemSpacedRepetitionTrackingTable,
                and(
                    eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId),
                    eq(itemSpacedRepetitionTrackingTable.type, 'flashcard')
                )
            )
            .where(eq(flashcardsTable.flashcardId, flashcardId));

        return flashcards[0];
    }

    public async getDueFlashcardsForTopicAndUser(
        topicId: number,
        userId: number,
        dueDate: string
    ): Promise<IFlashcard[]> {
        const flashcards = await db
            .select({
                flashcardId: flashcardsTable.flashcardId,
                topicId: topicsTable.topicId,
                topicName: topicsTable.name,
                front: flashcardsTable.front,
                back: flashcardsTable.back,
                imageUrl: flashcardsTable.imageUrl,
                createdAt: flashcardsTable.createdAt,

                // learning state (sm-2)
                learningState: {
                    status: itemSpacedRepetitionTrackingTable.status,
                    lastReviewed: itemSpacedRepetitionTrackingTable.lastReviewed,
                    nextReview: itemSpacedRepetitionTrackingTable.nextReview,
                    reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
                    easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
                    repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
                    step: itemSpacedRepetitionTrackingTable.step,
                },
            })
            .from(flashcardsTable)
            .innerJoin(topicsTable, eq(topicsTable.topicId, flashcardsTable.topicId))
            .innerJoin(
                itemSpacedRepetitionTrackingTable,
                and(
                    eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
                    eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId),
                    eq(itemSpacedRepetitionTrackingTable.userId, userId) // specific user
                )
            )
            .where(and(eq(topicsTable.topicId, topicId), lte(itemSpacedRepetitionTrackingTable.nextReview, dueDate)))
            .orderBy(asc(itemSpacedRepetitionTrackingTable.nextReview));

        return flashcards;
    }

    public async getFlashcardsForTopic(topicId: number): Promise<IFlashcard[]> {
        const flashcards = await db
            .select({
                flashcardId: flashcardsTable.flashcardId,
                topicId: flashcardsTable.topicId,
                front: flashcardsTable.front,
                back: flashcardsTable.back,
                imageUrl: flashcardsTable.imageUrl,
                createdAt: flashcardsTable.createdAt,
            })
            .from(flashcardsTable)
            .where(eq(flashcardsTable.topicId, topicId))
            .orderBy(flashcardsTable.createdAt);
        return flashcards;
    }

    public async insertFlashcards(flashcards: ICreateFlashcardRepo[], tx?: Transaction): Promise<IFlashcard[]> {
        let result: IFlashcard[];
        const executor = tx ?? db;
        result = await executor.insert(flashcardsTable).values(flashcards).returning({
            flashcardId: flashcardsTable.flashcardId,
            topicId: flashcardsTable.topicId,
            front: flashcardsTable.front,
            back: flashcardsTable.back,
            imageUrl: flashcardsTable.imageUrl,
            createdAt: flashcardsTable.createdAt,
        });
        return result;
    }

    // todo-ka: should remove and change into insertFlashcards
    public async insertFlashcardsIntoTopic(
        userId: number,
        topicId: number,
        flashcards: IInsertFlashcard[]
    ): Promise<void> {
        let flashcardsAdded = await db.insert(flashcardsTable).values(flashcards).returning({
            flashcardId: flashcardsTable.flashcardId,
        });
        const flashcardIds = flashcardsAdded.map(flashcard => flashcard.flashcardId);
        // todo-ka: repo should not call service
        await itemSpacedRepetitionTrackingService.insertSpacedRepetitionTrackingForFlashcards(
            userId,
            topicId,
            flashcardIds
        );
    }

    // !!this should not alter topicId of a flashcard
    public async updateFlashcards(flashcards: IUpdateFlashcard[]): Promise<IFlashcard[]> {
        let result: IFlashcard[] = [];
        for (const flashcard of flashcards) {
            const { flashcardId, ...rest } = flashcard;

            const [card] = await db
                .update(flashcardsTable)
                .set(rest)
                .where(eq(flashcardsTable.flashcardId, flashcardId))
                .returning({
                    topicId: flashcardsTable.topicId,
                    flashcardId: flashcardsTable.flashcardId,
                    front: flashcardsTable.front,
                    back: flashcardsTable.back,
                    imageUrl: flashcardsTable.imageUrl,
                    createdAt: flashcardsTable.createdAt,
                });
            result.push(card);
        }
        return result;
    }

    public async deleteFlashcards(flashcardsIds: number[], tx?: Transaction): Promise<void> {
        const executor = tx ?? db;
        for (const flashcardId of flashcardsIds) {
            await executor
                .delete(flashcardsTable)
                .where(eq(flashcardsTable.flashcardId, flashcardId))
                .returning({ flashcardId: flashcardsTable.flashcardId });
        }
    }

    public async applySM2ToFlashcard(
        userId: number,
        flashcardId: number,
        sm2: Omit<IFlashcardLearningState, 'status'>
    ): Promise<void> {
        await db
            .update(itemSpacedRepetitionTrackingTable)
            .set(sm2)
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
                    eq(itemSpacedRepetitionTrackingTable.itemId, flashcardId)
                )
            );
    }

    public async deleteFlashcardsInTopic(topicId: number, tx?: Transaction) {
        const executor = tx ?? db;
        await executor.delete(flashcardsTable).where(eq(flashcardsTable.topicId, topicId));
    }
}

export default new FlashcardRepo();
