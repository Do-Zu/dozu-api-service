import db from '@/libs/drizzleClient.lib';
import flashcardRepo, { ICreateFlashcardRepo, IUpdateFlashcardRepo } from '@/repositories/flashcard.repo';
import {
    IFlashcardCreateInput,
    IFlashcard,
    IFlashcardLearningState,
    IFlashcardsBatchInput,
    IQualityResponseNextReviewInterval,
    IFlashcardUpdateInput,
    IImageSaveInput,
    IFlashcardBatchResult,
} from '@/types/flashcard/flashcard.type';
import { IQualityResponse } from '../spaced-repetition-system/super-memo-2/superMemo2.service';
import SuperMemo2 from '../spaced-repetition-system/super-memo-2/superMemo2.service';
import { FlashcardItemInterface } from '@/dtos/generate';
import { ICreateTrackingRecord } from '@/types/tracking/itemSpacedRepetitionTracking.type';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';
import { getUserRoles } from '@/repositories/auth.repo';
import classEnrollmentService from '../class-based-learning/classEnrollment.service';
import topicService from '../topic/topic.service';
import unsplashLib from '@/libs/unsplash.lib';
import ankiService, {
    IAnkiCard,
    IAnkiRating,
    IAnkiResult,
    INextReviewIntervalForRating,
    learnAheadLimit,
} from '../spaced-repetition-system/super-memo-2/anki.service';
import { addMinutes } from 'date-fns';

export type IFlashcardWithReviewPrediction = Pick<
    IFlashcard,
    'flashcardId' | 'front' | 'back' | 'imageUrl' | 'topicName'
> & {
    qualityResponsesNextReviewInterval: IQualityResponseNextReviewInterval[];
};

export type ICardNextReviewSchedule = {
    flashcardId: number;
    nextReviewIntervalsForRating: INextReviewIntervalForRating[];
};

export interface INextReviewDataByRating {
    rating: IAnkiRating;
    data: IAnkiResult;
}

class FlashcardService {
    constructor() {}

    public async getSpacedRepetitionDataForFlashcard(flashcardId: number): Promise<IFlashcardLearningState> {
        const flashcard = await flashcardRepo.getSpacedRepetitionDataForFlashcard(flashcardId);
        return flashcard;
    }

    public async getFlashcardsForTopic(topicId: number): Promise<IFlashcard[]> {
        const flashcards = await flashcardRepo.getFlashcardsForTopic(topicId);
        return flashcards;
    }

    public async createFlashcardsForTopic(
        userId: number,
        topicId: number,
        flashcards: IFlashcardCreateInput[]
    ): Promise<IFlashcard[]> {
        const roles = await getUserRoles(userId);
        const isTeacher = roles.find(role => role.name === 'teacher') !== undefined;

        for (const card of flashcards) {
            if (card.image) await this.saveFlashcardImage(card.image);
        }

        const data: ICreateFlashcardRepo[] = flashcards.map(flashcard => {
            const card = {
                topicId,
                front: flashcard.front,
                back: flashcard.back,
                imageUrl: flashcard.image?.url, // insert imageUrl
            };
            if (card.imageUrl === undefined) {
                delete card['imageUrl'];
            }
            return card;
        });

        let result: IFlashcard[] = [];
        // belong to personal topic
        if (!isTeacher) {
            await db.transaction(async tx => {
                result = await flashcardRepo.insertFlashcards(data, tx);

                // insert tracking records for user
                const trackingRecords: ICreateTrackingRecord[] = result.map(flashcard => {
                    return {
                        userId,
                        topicId,
                        itemId: flashcard.flashcardId,
                        type: 'flashcard',
                        step: 0,
                    };
                });

                await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(trackingRecords, tx);
            });
        }

        // belong to class-based topic (teacher CRUD flashcards)
        else {
            const topic = await topicService.getTopicById(topicId);
            let { classId } = topic!;
            classId = classId!;
            await db.transaction(async tx => {
                result = await flashcardRepo.insertFlashcards(data, tx);
                const students = await classEnrollmentService.getStudentsInClass(classId);

                // insert tracking records for teacher
                const trackingRecords: ICreateTrackingRecord[] = result.map(flashcard => {
                    return {
                        userId,
                        topicId,
                        itemId: flashcard.flashcardId,
                        type: 'flashcard',
                        step: 0,
                    };
                });

                await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(trackingRecords, tx);

                // students who are leanring that topic (tracking records should > 0)
                const studentsLearning: { studentId: number }[] = [];

                // get students who are learning
                for (const student of students) {
                    const trackingRecords = await itemSpacedRepetitionTrackingRepo.getTrackingRecordsByUserAndTopicId(
                        {
                            userId: student.userId,
                            topicId,
                            itemtype: 'flashcard',
                        },
                        tx
                    );
                    if (trackingRecords.length > 0) {
                        studentsLearning.push({ studentId: student.userId });
                    }
                }

                // create sm-2 records for students learning
                for (const student of studentsLearning) {
                    const trackingRecords: ICreateTrackingRecord[] = result.map(flashcard => {
                        return {
                            userId: student.studentId,
                            topicId,
                            itemId: flashcard.flashcardId,
                            type: 'flashcard',
                            step: 0,
                        };
                    });

                    await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(trackingRecords, tx);
                }
            });
        }

        return result;
    }

    public async handleInsertFlashcardsForNode(
        userId: number,
        topicId: number,
        nodeId: string,
        flashcards: IFlashcardCreateInput[] | FlashcardItemInterface[]
    ): Promise<void> {
        let data = flashcards.map(flashcard => {
            if ('front' in flashcard && 'back' in flashcard) {
                return { topicId: topicId, front: flashcard.front, back: flashcard.back, nodeId: nodeId };
            } else {
                return { topicId, front: flashcard.q, back: flashcard.a, nodeId: nodeId };
            }
        });

        //reusing topic's repo functions since nodeId value is added already - DuyND
        await flashcardRepo.insertFlashcardsIntoTopic(userId, topicId, data);
    }

    public async updateFlashcardsInTopic(flashcards: IFlashcardUpdateInput[]): Promise<IFlashcard[]> {
        for (const card of flashcards) {
            if (card.image) await this.saveFlashcardImage(card.image);
        }
        const data: IUpdateFlashcardRepo[] = flashcards.map(flashcard => {
            const card = {
                flashcardId: flashcard.flashcardId,
                front: flashcard.front,
                back: flashcard.back,
                imageUrl: flashcard.image?.url, // insert imageUrl
            };
            if (card.imageUrl === undefined) {
                delete card['imageUrl'];
            }
            return card;
        });

        const result = await flashcardRepo.updateFlashcards(data);
        return result;
    }

    public async deleteFlashcardsByIds(flashcardsIds: number[]): Promise<void> {
        await db.transaction(async tx => {
            await flashcardRepo.deleteFlashcards(flashcardsIds, tx);
        });
    }

    // todo-ka: use transaction
    public async batchFlashcardsForTopic(
        userId: number,
        topicId: number,
        { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatchInput
    ): Promise<IFlashcardBatchResult> {
        let result: IFlashcardBatchResult = { flashcardsAdded: [], flashcardsUpdated: [] };

        if (flashcardsAdded && flashcardsAdded.length > 0) {
            result.flashcardsAdded = await this.createFlashcardsForTopic(userId, topicId, flashcardsAdded);
        }

        if (flashcardsUpdated && flashcardsUpdated.length > 0) {
            result.flashcardsUpdated = await this.updateFlashcardsInTopic(flashcardsUpdated);
        }

        if (flashcardsDeleted && flashcardsDeleted.length > 0) {
            await this.deleteFlashcardsByIds(flashcardsDeleted);
        }

        return result;
    }

    public async handleBatchFlashcardsForNode(
        userId: number,
        topicId: number,
        nodeId: string,
        { flashcardsAdded, flashcardsUpdated, flashcardsDeleted }: IFlashcardsBatchInput
    ): Promise<void> {
        if (flashcardsAdded && flashcardsAdded.length > 0) {
            await this.handleInsertFlashcardsForNode(userId, topicId, nodeId, flashcardsAdded);
        }

        if (flashcardsUpdated && flashcardsUpdated.length > 0) {
            //implements later
            // await this.handleUpdateFlashcardsForTopic(flashcardsUpdated);
        }

        if (flashcardsDeleted && flashcardsDeleted.length > 0) {
            //implements later
            // await this.handleDeleteFlashcardsForTopic(flashcardsDeleted);
        }
    }

    public async applySM2ToFlashcard(
        userId: number,
        flashcardId: number,
        sm2: Omit<IFlashcardLearningState, 'status'>
    ): Promise<void> {
        await flashcardRepo.applySM2ToFlashcard(userId, flashcardId, sm2);
    }

    public async getDueFlashcardsForTopicAndUser(
        topicId: number,
        userId: number,
        currentDate: string
    ): Promise<IFlashcard[]> {
        // serve for Anki algorithm
        const dueDate = addMinutes(new Date(currentDate), learnAheadLimit);
        const flashcards = await flashcardRepo.getDueFlashcardsForTopicAndUser(topicId, userId, dueDate.toISOString());
        return flashcards;
    }

    public async getReviewIntervalsByQualityResponses(
        flashcards: IFlashcard[]
    ): Promise<IFlashcardWithReviewPrediction[]> {
        let result: IFlashcardWithReviewPrediction[] = [];

        for (const flashcard of flashcards) {
            if (!flashcard.learningState) {
                throw new Error('Flashcard does not have learningState');
            }
            const { reviewInterval, easinessFactor, repetitionNumber } = flashcard.learningState;
            let qualityResponse = 0;
            let data: IFlashcardWithReviewPrediction & {
                qualityResponsesNextReviewInterval: IQualityResponseNextReviewInterval[];
            } = {
                flashcardId: flashcard.flashcardId,
                front: flashcard.front,
                back: flashcard.back,
                imageUrl: flashcard.imageUrl,

                topicName: flashcard.topicName ? flashcard.topicName : '',
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
                data.qualityResponsesNextReviewInterval.push({
                    qualityResponse: qualityResponse as IQualityResponse,
                    nextReviewInterval: info.reviewInterval,
                });
            }
            result.push(data);
        }
        return result;
    }

    public getCardNextReviewSchedule(
        flashcardId: number,
        learningState: IFlashcardLearningState
    ): ICardNextReviewSchedule {
        if (!learningState) {
            throw new Error('Flashcard does not have learningState');
        }
        let result: ICardNextReviewSchedule = {
            flashcardId,
            nextReviewIntervalsForRating: [],
        };
        let rating = IAnkiRating.AGAIN;
        for (; rating <= IAnkiRating.EASY; ++rating) {
            const ankiCard: IAnkiCard = {
                ...learningState,
                step: learningState.step,
                flashcardId,
                lastReviewed: learningState.lastReviewed ? new Date(learningState.lastReviewed) : null,
                nextReview: new Date(learningState.nextReview),
            };
            const ankiResult = ankiService.schedule(ankiCard, rating);
            result.nextReviewIntervalsForRating.push({
                rating,
                interval: ankiResult.nextReviewInterval,
            });
        }
        return result;
    }

    public getNextReviewByRatings(flashcardId: number, learningState: IFlashcardLearningState): INextReviewDataByRating[] {
        if (!learningState) {
            throw new Error('Flashcard does not have learningState');
        }
        let result: INextReviewDataByRating[] = [];

        let rating = IAnkiRating.AGAIN;
        for (; rating <= IAnkiRating.EASY; ++rating) {
            const ankiCard: IAnkiCard = {
                ...learningState,
                step: learningState.step,
                flashcardId,
                lastReviewed: learningState.lastReviewed ? new Date(learningState.lastReviewed) : null,
                nextReview: new Date(learningState.nextReview),
            };
            const ankiResult = ankiService.schedule(ankiCard, rating);
            result.push({ rating, data: ankiResult });
        }

        return result;
    }

    public async saveFlashcardImage(image: IImageSaveInput) {
        await unsplashLib.downloadImage(image.downloadLocation);
    }
}

export default new FlashcardService();
