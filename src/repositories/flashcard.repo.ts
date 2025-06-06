import db from '@/libs/drizzleClient.lib';
import {
  flashcardsTable,
  IFlashcardStatus,
  itemSpacedRepetitionTrackingTable,
  topicsTable,
  usersTable,
} from '@/models';
import {
  IFlashcardSpacedRepetition,
  IFlashcardFull,
  IFlashcardBasic,
  IFlashcardAdded,
  IFlashcardUpdated,
  IFlashcardDeleted,
} from '@/types/flashcard/flashcard.type';
import { getDateFormatted } from '@/utils/date';
import { and, asc, eq, lte, ne } from 'drizzle-orm';
import ItemSpacedRepetitionTrackingRepo from './tracking/itemSpacedRepetitionTracking.repo';

const itemSpacedRepetitionTrackingRepo = new ItemSpacedRepetitionTrackingRepo();

export type IFlashcardsForTopicReturned = (Omit<IFlashcardBasic, 'topicId'> & {
  status: IFlashcardStatus;
})[];
export type IFlashcardSpacedRepetitionReturned = Pick<
  IFlashcardSpacedRepetition,
  'reviewInterval' | 'easinessFactor' | 'repetitionNumber'
>;
export type IFlashcardsLearningForUserReturned = Omit<IFlashcardFull, 'lastReviewed'>[];

export type IFlashcardAddedArgument = (IFlashcardAdded & { topicId: number })[];
export type IPutFlashcardToLearningArgumentDate = Pick<
  IFlashcardSpacedRepetition,
  'lastReviewed' | 'nextReview'
>;
export type IApplyFlashcardSM2ArgumentSM2 = Omit<
  IFlashcardSpacedRepetition,
  'flashcardId' | 'status'
>;

class FlashcardRepo {
  constructor() {}

  // done check type
  public async handleGetFlashcardSpacedRepetition(
    flashcardId: number
  ): Promise<IFlashcardSpacedRepetitionReturned> {
    const flashcards = await db
      .select({
        reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
        easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
        repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
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

  // done check type
  public async handleGetFlashcardsLearningForUser(
    userId: number,
    currentDate: Date
  ): Promise<IFlashcardsLearningForUserReturned> {
    const flashcards = await db
      .select({
        flashcardId: flashcardsTable.flashcardId,
        topicId: topicsTable.topicId,
        topicName: topicsTable.name,
        front: flashcardsTable.front,
        back: flashcardsTable.back,
        status: itemSpacedRepetitionTrackingTable.status,
        nextReview: itemSpacedRepetitionTrackingTable.nextReview,

        // extra selection for calculating next time review
        reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
        easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
        repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
      })
      .from(flashcardsTable)
      .innerJoin(topicsTable, eq(flashcardsTable.topicId, topicsTable.topicId))
      .innerJoin(usersTable, eq(topicsTable.userId, usersTable.userId))
      .innerJoin(
        itemSpacedRepetitionTrackingTable,
        and(
          eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
          eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId)
        )
      )
      .where(
        and(
          eq(usersTable.userId, userId),
          ne(itemSpacedRepetitionTrackingTable.status, 'new'),
          lte(itemSpacedRepetitionTrackingTable.nextReview, getDateFormatted(currentDate))
        )
      )
      .orderBy(asc(itemSpacedRepetitionTrackingTable.nextReview));

    return flashcards;
  }

  // done check type
  public async handleGetAllFlashcardsForTopic(
    topicId: number
  ): Promise<IFlashcardsForTopicReturned> {
    const flashcards = await db
      .select({
        flashcardId: flashcardsTable.flashcardId,
        front: flashcardsTable.front,
        back: flashcardsTable.back,
        status: itemSpacedRepetitionTrackingTable.status,
      })
      .from(flashcardsTable)
      .innerJoin(
        itemSpacedRepetitionTrackingTable,
        and(
          eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
          eq(itemSpacedRepetitionTrackingTable.itemId, flashcardsTable.flashcardId)
        )
      )
      .where(eq(flashcardsTable.topicId, topicId))
      .orderBy(flashcardsTable.createdAt);
    return flashcards;
  }

  // done check type
  public async handleInsertFlashcardsForTopic(
    userId: number,
    flashcards: IFlashcardAddedArgument
  ): Promise<void> {
    let flashcardsAdded = await db.insert(flashcardsTable).values(flashcards).returning({
      flashcardId: flashcardsTable.flashcardId,
    });
    const flashcardIds = flashcardsAdded.map(flashcard => flashcard.flashcardId);
    await itemSpacedRepetitionTrackingRepo.handleInsertDefaultFlashcardSpacedRepetitions(
      userId,
      flashcardIds
    );
  }

  // done check type
  public async handleUpdateFlashcardsForTopic(flashcards: IFlashcardUpdated[]): Promise<void> {
    for (const flashcard of flashcards) {
      const { flashcardId, front, back } = flashcard;

      await db
        .update(flashcardsTable)
        .set({ front, back })
        .where(eq(flashcardsTable.flashcardId, flashcardId))
        .returning({
          topicId: flashcardsTable.topicId,
          flashcardId: flashcardsTable.flashcardId,
          front: flashcardsTable.front,
          back: flashcardsTable.back,
        });
    }
  }

  // done check type
  public async handleDeleteFlashcardsForTopic(flashcardsIds: IFlashcardDeleted[]): Promise<void> {
    for (const flashcardId of flashcardsIds) {
      await db
        .delete(flashcardsTable)
        .where(eq(flashcardsTable.flashcardId, flashcardId))
        .returning({ flashcardId: flashcardsTable.flashcardId });
    }
  }

  // done check type
  public async handlePutFlashcardToLearning(
    flashcardId: number,
    date: IPutFlashcardToLearningArgumentDate
  ): Promise<void> {
    const value: Pick<IFlashcardSpacedRepetition, 'lastReviewed' | 'nextReview' | 'status'> = {
      ...date,
      status: 'learning',
    };

    await db
      .update(itemSpacedRepetitionTrackingTable)
      .set(value)
      .where(
        and(
          eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
          eq(itemSpacedRepetitionTrackingTable.itemId, flashcardId)
        )
      );
  }

  public async handleApplyFlashcardSM2(
    flashcardId: number,
    sm2: IApplyFlashcardSM2ArgumentSM2
  ): Promise<void> {
    await db
      .update(itemSpacedRepetitionTrackingTable)
      .set(sm2)
      .where(
        and(
          eq(itemSpacedRepetitionTrackingTable.type, 'flashcard'),
          eq(itemSpacedRepetitionTrackingTable.itemId, flashcardId)
        )
      );
  }
}

export default FlashcardRepo;
