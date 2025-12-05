import unsplashLib from '@/libs/unsplash.lib';
import flashcardRepo from '@/repositories/flashcard/v2/flashcard.repo';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';
import { learnAheadLimit } from '@/services/spaced-repetition-system/super-memo-2/anki.service';
import {
    IDueAnkiCard,
    IFlashcard,
    IFlashcardLearningState,
    IImageSaveInput,
    InsertFlashcardsBody,
    IUnspashImageSaveInput,
    IUpdateFlashcard,
    IUpdateFlashcardsBody,
} from '@/types/flashcard/flashcard.type';
import { ICreateTrackingRecord } from '@/types/tracking/itemSpacedRepetitionTracking.type';
import ankiUtils from '@/utils/anki/anki.utils';
import { getCurrentDateInTimeZone } from '@/utils/date';
import { addMinutes } from 'date-fns';

class FlashcardService {
    private async saveFlashcardImage(image: IUnspashImageSaveInput) {
        await unsplashLib.downloadImage(image.data.downloadLocation);
    }

    private getSavedImageUrl(imageInput: IImageSaveInput | null | undefined) {
        let savedImageUrl: string | undefined = undefined;
        if (imageInput?.type === 'unsplash') {
            savedImageUrl = imageInput.data.url;
        } else if (imageInput?.type === 'upload') {
            savedImageUrl = imageInput.data;
        }
        return savedImageUrl;
    }

    public async createFlashcardsForTopic(
        topicId: number,
        { userId, flashcards }: { userId: number; flashcards: InsertFlashcardsBody }
    ) {
        for (const card of flashcards) {
            if (card.image && card.image.type === 'unsplash') await this.saveFlashcardImage(card.image);
        }

        const insertInputs = flashcards.map(item => {
            const savedImageUrl = this.getSavedImageUrl(item.image);
            return {
                ...item,
                topicId,
                image: savedImageUrl,
            };
        });
        const insertedFlashcards = await flashcardRepo.insertFlashcards(insertInputs);

        const currentDate = getCurrentDateInTimeZone();
        const trackingRecords: ICreateTrackingRecord[] = insertedFlashcards.map(flashcard => {
            return {
                userId,
                topicId,
                itemId: flashcard.flashcardId,
                type: 'flashcard',
                step: 0,
                nextReview: currentDate.toISOString(),
            };
        });
        await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(trackingRecords);
        const defaultAnkiValues = ankiUtils.getDefaultAnkiValues({ currentDate: currentDate.toISOString() });
        const result: IFlashcard[] = insertedFlashcards.map(item => ({
            ...item,
            learningState: { ...defaultAnkiValues },
        }));

        return result;
    }

    public async updateFlashcardsInTopic(topicId: number, flashcards: IUpdateFlashcardsBody) {
        for (const card of flashcards) {
            if (card.image && card.image.type === 'unsplash') await this.saveFlashcardImage(card.image);
        }

        const updatedFlashcards: IUpdateFlashcard[] = flashcards.map(item => {
            const savedImageUrl = this.getSavedImageUrl(item.image);
            return {
                ...item,
                image: savedImageUrl,
            };
        });

        const result = await flashcardRepo.updateFlashcardsInTopic(topicId, updatedFlashcards);
        return result;
    }

    public async deleteFlashcardsInTopic(topicId: number, flashcardIds: number[]) {
        // todo: handle delete flashcards uploaded & delete sm2 records

        const deletedFlashcards = await flashcardRepo.deleteFlashcardsInTopic(topicId, flashcardIds);
        const deletedIds = deletedFlashcards.map(item => item.flashcardId);
        return deletedIds;
    }

    private async lazyInitTracking(topicId: number, userId: number) {
        const missing = await flashcardRepo.getFlashcardMissingTracking(topicId, userId);
        if (missing.length === 0) return;

        const trackingRecords: ICreateTrackingRecord[] = missing.map(r => ({
            userId,
            topicId,
            itemId: r.flashcardId,
            type: 'flashcard',
            step: 0,
        }));

        await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(trackingRecords);
    }

    public async getDueAnkiCardsForTopicAndUser(
        topicId: number,
        userId: number,
        currentDate: string
    ): Promise<IDueAnkiCard[]> {
        // serve for Anki algorithm
        const dueDate = addMinutes(new Date(currentDate), learnAheadLimit);

        await this.lazyInitTracking(topicId, userId);

        const dueFlashcards: IFlashcard[] = await flashcardRepo.getDueFlashcardsForTopicAndUser(
            topicId,
            userId,
            dueDate.toISOString()
        );

        const dueAnkiCards: IDueAnkiCard[] = dueFlashcards.map(card => {
            return {
                nodeId: card.nodeId,
                flashcardId: card.flashcardId,
                front: card.front,
                back: card.back,
                imageUrl: card.imageUrl,
                topicName: card.topicName,
                learningState: card.learningState as IFlashcardLearningState,
                nextReview: card.learningState!.nextReview,
                status: card.learningState!.status,
            };
        });

        return dueAnkiCards;
    }
}

export default new FlashcardService();
