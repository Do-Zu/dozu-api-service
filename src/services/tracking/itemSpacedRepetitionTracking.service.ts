import flashcardRepo from '@/repositories/flashcard.repo';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';
import { ICreateTrackingRecord } from '@/types/tracking/itemSpacedRepetitionTracking.type';

class ItemSpacedRepetitionTrackingService {
    public async insertSpacedRepetitionTrackingForFlashcards(
        userId: number,
        topicId: number,
        flashcardIds: number[]
    ): Promise<void> {
        const data : ICreateTrackingRecord[] = flashcardIds.map(flashcardId => ({
            userId,
            topicId,
            itemId: flashcardId,
            type: 'flashcard',
        }));

        await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(data);
    }

    public async initializeStudentTrackingForTopic(userId: number, topicId: number) : Promise<void> {
        const flashcards = await flashcardRepo.getFlashcardsForTopic(topicId);
        const data : ICreateTrackingRecord[] = flashcards.map(flashcard => ({
            userId,
            topicId,
            itemId: flashcard.flashcardId,
            type: 'flashcard'
        }))
        await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(data);
    }
}

export default new ItemSpacedRepetitionTrackingService();
