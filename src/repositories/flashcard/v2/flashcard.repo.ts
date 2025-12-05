import { flashcardsTable, itemSpacedRepetitionTrackingTable, topicsTable, TypeInsertFlashcard } from '@/models';
import { IFlashcard, IUpdateFlashcard } from '@/types/flashcard/flashcard.type';
import db from '@/libs/drizzleClient.lib';
import { and, asc, eq, getTableColumns, inArray, isNull, lte } from 'drizzle-orm';

class FlashcardRepo {
    public async insertFlashcards(flashcards: TypeInsertFlashcard[]): Promise<IFlashcard[]> {
        let result: IFlashcard[];
        result = await db.insert(flashcardsTable).values(flashcards).returning();
        return result;
    }

    public async updateFlashcardsInTopic(topicId: number, flashcards: IUpdateFlashcard[]): Promise<IFlashcard[]> {
        let result: IFlashcard[] = [];
        for (const flashcard of flashcards) {
            const { flashcardId, ...data } = flashcard;

            const [card] = await db
                .update(flashcardsTable)
                .set(data)
                .where(and(eq(flashcardsTable.topicId, topicId), eq(flashcardsTable.flashcardId, flashcardId)))
                .returning();
            result.push(card);
        }
        return result;
    }

    public async deleteFlashcardsInTopic(topicId: number, flashcardsIds: number[]): Promise<IFlashcard[]> {
        const result = await db
            .delete(flashcardsTable)
            .where(and(eq(flashcardsTable.topicId, topicId), inArray(flashcardsTable.flashcardId, flashcardsIds)))
            .returning();
        return result;
    }

    public async getFlashcardMissingTracking(topicId: number, userId: number) {
        const result = await db
            .select({ flashcardId: flashcardsTable.flashcardId })
            .from(flashcardsTable)
            .leftJoin(
                itemSpacedRepetitionTrackingTable,
                and(
                    eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
                    eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId),
                    eq(itemSpacedRepetitionTrackingTable.userId, userId)
                )
            )
            .where(and(eq(flashcardsTable.topicId, topicId), isNull(itemSpacedRepetitionTrackingTable.itemId)));

        return result;
    }

    public async getDueFlashcardsForTopicAndUser(
        topicId: number,
        userId: number,
        dueDate: string
    ): Promise<IFlashcard[]> {
        const flashcards = await db
            .select({
                ...getTableColumns(flashcardsTable),

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
}

export default new FlashcardRepo();
