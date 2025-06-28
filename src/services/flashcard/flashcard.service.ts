import FlashcardRepo, {
    IFlashcardAddedArgument,
    IPutFlashcardToLearningArgumentDate,
    IFlashcardsForTopicReturned,
    IFlashcardsLearningForUserReturned,
    IFlashcardSpacedRepetitionReturned,
    IApplyFlashcardSM2ArgumentSM2,
} from '@/repositories/flashcard.repo';
import {
    IFlashcardAdded,
    IFlashcardDeleted,
    IFlashcardFull,
    IFlashcardsBatch,
    IFlashcardUpdated,
    IQualityResponseNextReviewInterval,
} from '@/types/flashcard/flashcard.type';
import { IQualityResponse } from '../spaced-repetition-system/super-memo-2/superMemo2.origin';
import { getDateAdded, getDateFormatted } from '@/utils/date';
import SuperMemo2 from '../spaced-repetition-system/super-memo-2/superMemo2.origin';
import { FlashcardItemInterface } from '@/dtos/generate';

const flashcardRepo = new FlashcardRepo();

export type IFlashcardNextReviewReturned = Pick<IFlashcardFull, 'flashcardId' | 'front' | 'back' | 'topicName'> & {
    qualityResponsesNextReviewInterval: IQualityResponseNextReviewInterval[];
};

export type IFlashcardNextReviewArgumentFlashcards = Omit<IFlashcardFull, 'lastReviewed'>[];

class FlashcardService {
    constructor() {}

    public async handleGetFlashcardSpacedRepetition(flashcardId: number): Promise<IFlashcardSpacedRepetitionReturned> {
        const flashcard = await flashcardRepo.handleGetFlashcardSpacedRepetition(flashcardId);
        return flashcard;
    }

    public async handleGetAllFlashcardsForTopic(topicId: number): Promise<IFlashcardsForTopicReturned> {
        const flashcards = await flashcardRepo.handleGetAllFlashcardsForTopic(topicId);
        return flashcards;
    }

    public async handleInsertFlashcardsForTopic(
        userId: number,
        topicId: number,
        flashcards: IFlashcardAdded[] | FlashcardItemInterface[]
    ): Promise<void> {
        let flashcardsFormatted: IFlashcardAddedArgument = flashcards.map(flashcard => {
            if ('front' in flashcard && 'back' in flashcard) {
                return { topicId: topicId, front: flashcard.front, back: flashcard.back };
            } else {
                return { topicId, front: flashcard.q, back: flashcard.a };
            }
        });

        await flashcardRepo.handleInsertFlashcardsForTopic(userId, topicId, flashcardsFormatted);
    }

    public async handleUpdateFlashcardsForTopic(flashcards: IFlashcardUpdated[]): Promise<void> {
        await flashcardRepo.handleUpdateFlashcardsForTopic(flashcards);
    }

    public async handleDeleteFlashcardsForTopic(flashcardsIds: IFlashcardDeleted[]): Promise<void> {
        await flashcardRepo.handleDeleteFlashcardsForTopic(flashcardsIds);
    }

    public async handleBatchFlashcardsForTopic(
        userId: number,
        topicId: number,
        { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatch
    ): Promise<void> {
        if (flashcardsAdded && flashcardsAdded.length > 0) {
            await this.handleInsertFlashcardsForTopic(userId, topicId, flashcardsAdded);
        }

        if (flashcardsUpdated && flashcardsUpdated.length > 0) {
            await this.handleUpdateFlashcardsForTopic(flashcardsUpdated);
        }

        if (flashcardsDeleted && flashcardsDeleted.length > 0) {
            await this.handleDeleteFlashcardsForTopic(flashcardsDeleted);
        }
    }

    public async handlePutFlashcardToLearning(flashcardId: number): Promise<void> {
        const currentDate = new Date(Date.now());
        const tommorow = getDateAdded(currentDate, 1);

        const date: IPutFlashcardToLearningArgumentDate = {
            lastReviewed: getDateFormatted(currentDate),
            nextReview: getDateFormatted(tommorow),
        };

        await flashcardRepo.handlePutFlashcardToLearning(flashcardId, date);
    }

    public async handleApplyFlashcardSM2(flashcardId: number, sm2: IApplyFlashcardSM2ArgumentSM2): Promise<void> {
        await flashcardRepo.handleApplyFlashcardSM2(flashcardId, sm2);
    }

    public async handleGetFlashcardsLearningForUser(userId: number): Promise<IFlashcardsLearningForUserReturned> {
        const currentDate = new Date(Date.now());
        const flashcards = await flashcardRepo.handleGetFlashcardsLearningForUser(userId, currentDate);
        return flashcards;
    }

    public async handleGetFlashcardsLearningForTopic(topicId: number): Promise<IFlashcardsLearningForUserReturned> {
        const currentDate = new Date(Date.now());
        const flashcards = await flashcardRepo.handleGetFlashcardsLearningForTopic(topicId, currentDate);
        return flashcards;
    }

    // done check type
    public async handleGetNextReviewIntervalsForAllQualityResponses(
        flashcards: IFlashcardNextReviewArgumentFlashcards
    ): Promise<IFlashcardNextReviewReturned[]> {
        let flashcardsReturned: IFlashcardNextReviewReturned[] = [];

        for (const flashcard of flashcards) {
            const { reviewInterval, easinessFactor, repetitionNumber } = flashcard;
            let qualityResponse = 0;
            let flashcardReturned: IFlashcardNextReviewReturned & {
                qualityResponsesNextReviewInterval: IQualityResponseNextReviewInterval[];
            } = {
                flashcardId: flashcard.flashcardId,
                topicName: flashcard.topicName,
                front: flashcard.front,
                back: flashcard.back,
                qualityResponsesNextReviewInterval: [],
            };
            for (; qualityResponse <= 5; ++qualityResponse) {
                const superMemo2 = new SuperMemo2(
                    easinessFactor,
                    reviewInterval,
                    repetitionNumber,
                    qualityResponse as IQualityResponse
                );
                const info = superMemo2.calc();
                flashcardReturned.qualityResponsesNextReviewInterval.push({
                    qualityResponse: qualityResponse as IQualityResponse,
                    nextReviewInterval: info.reviewInterval,
                });
            }
            flashcardsReturned.push(flashcardReturned);
        }
        return flashcardsReturned;
    }
}

export default FlashcardService;
