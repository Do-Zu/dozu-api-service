import db from '@/libs/drizzleClient.lib';
import { flashcardsTable, topicsTable, usersTable } from '@/models';
import {
  IFlashcardAdded,
  IFlashcardDeleted,
  IFlashcardFieldsReturned,
  IFlashcardPracticed,
  IFlashcardProgressUpdated,
  IFlashcardReturned,
  IFlashcardUpdated,
} from '@/types/flashcard/flashcard.type';
import { getDateFormatted } from '@/utils/date/date';
import { and, asc, eq, lte, ne } from 'drizzle-orm';

type IFlashcardAddedRepo = IFlashcardAdded & {
  topicId: number;
};

const handleGetSingleFlashcard = async (
  flashcardId: number,
  fieldsReturned: IFlashcardFieldsReturned
) => {
  const flashcards = await db
    .select(fieldsReturned)
    .from(flashcardsTable)
    .where(eq(flashcardsTable.flashcardId, flashcardId));
  return flashcards[0];
};

const handleGetFlashcardsPracticedForUser = async (
  userId: number,
  currentDate: Date
): Promise<IFlashcardPracticed[]> => {
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

  const flashcardsFormatted = flashcards.map(flashcard => {
    return {
      ...flashcard,
      status: flashcard.status!,
      reviewInterval: flashcard.reviewInterval!,
      easinessFactor: flashcard.easinessFactor!,
      repetitionNumber: flashcard.repetitionNumber!,
    };
  });

  return flashcardsFormatted;
};

const handleGetAllFlashcardsForTopic = async (topicId: number): Promise<IFlashcardReturned[]> => {
  const flashcards = await db.query.flashcardsTable.findMany({
    where: eq(flashcardsTable.topicId, topicId),
    columns: {
      flashcardId: true,
      topicId: true,
      front: true,
      back: true,
      status: true,
      // nextReview: true
    },
    orderBy: [asc(flashcardsTable.flashcardId)],
  });
  return flashcards;
};

const handleInsertFlashcardsForTopic = async (
  flashcards: IFlashcardAddedRepo[]
): Promise<IFlashcardReturned[]> => {
  let flashcardsAdded = await db.insert(flashcardsTable).values(flashcards).returning({
    topicId: flashcardsTable.topicId,
    flashcardId: flashcardsTable.flashcardId,
    front: flashcardsTable.front,
    back: flashcardsTable.back,
  });
  return flashcardsAdded;
};

const handleUpdateSingleFlashcardForTopic = async (
  flashcard: IFlashcardUpdated
): Promise<IFlashcardReturned> => {
  const { flashcardId, front, back } = flashcard;

  const fieldsReturned = {
    topicId: flashcardsTable.topicId,
    flashcardId: flashcardsTable.flashcardId,
    front: flashcardsTable.front,
    back: flashcardsTable.back,
  };

  const flashcardsUpdated = await db
    .update(flashcardsTable)
    .set({ front, back })
    .where(eq(flashcardsTable.flashcardId, flashcardId))
    .returning(fieldsReturned);

  return flashcardsUpdated[0];
};
const handleUpdateFlashcardsForTopic = async (
  flashcards: IFlashcardUpdated[]
): Promise<IFlashcardReturned[]> => {
  let flashcardsUpdated = [];

  for (const flashcard of flashcards) {
    const { flashcardId, front, back } = flashcard;

    const flashcardUpdated = await db
      .update(flashcardsTable)
      .set({ front, back })
      .where(eq(flashcardsTable.flashcardId, flashcardId))
      .returning({
        topicId: flashcardsTable.topicId,
        flashcardId: flashcardsTable.flashcardId,
        front: flashcardsTable.front,
        back: flashcardsTable.back,
      });
    flashcardsUpdated.push(...flashcardUpdated);
  }
  return flashcardsUpdated;
};

const handleDeleteFlashcardsForTopic = async (flashcardsIds: IFlashcardDeleted[]) => {
  let flashcardsDeleted: number[] = [];
  for (const flashcardId of flashcardsIds) {
    let flashcardDeleted = await db
      .delete(flashcardsTable)
      .where(eq(flashcardsTable.flashcardId, flashcardId))
      .returning({ flashcardId: flashcardsTable.flashcardId });
    flashcardsDeleted.push(flashcardDeleted[0].flashcardId);
  }
  return flashcardsDeleted;
};

const handleUpdateFlashcardProgress = async (
  flashcardId: number,
  infoUpdated: IFlashcardProgressUpdated,
  fieldsReturned: IFlashcardFieldsReturned
) => {
  let { repetitionNumber, easinessFactor, reviewInterval, lastReviewed, nextReview, status } =
    infoUpdated;

  if (easinessFactor !== undefined && typeof easinessFactor === 'number')
    easinessFactor = easinessFactor.toPrecision(3);
  if (lastReviewed && typeof lastReviewed !== 'string')
    lastReviewed = getDateFormatted(lastReviewed);
  if (nextReview && typeof nextReview !== 'string') nextReview = getDateFormatted(nextReview);

  const infoUpdatedFormatted = {
    repetitionNumber,
    easinessFactor,
    reviewInterval,
    lastReviewed,
    nextReview,
    status,
  };

  const flashcardUpdated = await db
    .update(flashcardsTable)
    .set(infoUpdatedFormatted)
    .where(eq(flashcardsTable.flashcardId, flashcardId))
    .returning(fieldsReturned);

  return flashcardUpdated;
};

const flashcardRepo = {
  handleGetAllFlashcardsForTopic,
  handleInsertFlashcardsForTopic,
  handleUpdateSingleFlashcardForTopic,
  handleUpdateFlashcardsForTopic,
  handleDeleteFlashcardsForTopic,

  handleGetSingleFlashcard,
  handleGetFlashcardsPracticedForUser,
  handleUpdateFlashcardProgress,
};

export default flashcardRepo;
