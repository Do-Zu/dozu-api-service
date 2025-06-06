import db from '@/libs/drizzleClient.lib';
import { itemSpacedRepetitionTrackingTable } from '@/models';

export default class ItemSpacedRepetitionTrackingRepo {
  public async handleInsertDefaultFlashcardSpacedRepetitions(
    userId: number,
    flashcardIds: number[]
  ) {
    const values = flashcardIds.map(flashcardId => ({
      userId,
      itemId: flashcardId,
      type: 'flashcard',
    })) as { userId: number; itemId: number; type: 'flashcard' }[];
    await db.insert(itemSpacedRepetitionTrackingTable).values(values);
  }
}
