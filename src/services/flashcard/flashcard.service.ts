import db from '@/libs/drizzleClient.lib';
import flashcardRepo, { ICreateFlashcardRepo } from '@/repositories/flashcard.repo';
import {
    IFlashcardCreateInput,
    IFlashcard,
    IFlashcardLearningState,
    IFlashcardsBatchInput,
    IQualityResponseNextReviewInterval,
    IFlashcardUpdateInput,
} from '@/types/flashcard/flashcard.type';
import { IQualityResponse } from '../spaced-repetition-system/super-memo-2/superMemo2.origin';
import SuperMemo2 from '../spaced-repetition-system/super-memo-2/superMemo2.origin';
import { FlashcardItemInterface } from '@/dtos/generate';
import { ICreateTrackingRecord } from '@/types/tracking/itemSpacedRepetitionTracking.type';
import itemSpacedRepetitionTrackingRepo from '@/repositories/tracking/itemSpacedRepetitionTracking.repo';
import { getUserRoles } from '@/repositories/auth.repo';
import classEnrollmentService from '../class-based-learning/classEnrollment.service';
import topicService from '../topic/topic.service';

export type IFlashcardWithReviewPrediction = Pick<IFlashcard, 'flashcardId' | 'front' | 'back' | 'topicName'> & {
    qualityResponsesNextReviewInterval: IQualityResponseNextReviewInterval[];
};

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
    ): Promise<void> {
        const roles = await getUserRoles(userId);
        const isTeacher = roles.find(role => role.name === 'teacher') !== undefined;

        const data: ICreateFlashcardRepo[] = flashcards.map(flashcard => {
            return { topicId, front: flashcard.front, back: flashcard.back };
        });

        // belong to personal topic
        if (!isTeacher) {
            await db.transaction(async tx => {
                const flashcards = await flashcardRepo.insertFlashcards(data, tx);

                // insert tracking records for user
                const trackingRecords: ICreateTrackingRecord[] = flashcards.map(flashcard => {
                    return {
                        userId,
                        topicId,
                        itemId: flashcard.flashcardId,
                        type: 'flashcard',
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
                const flashcards = await flashcardRepo.insertFlashcards(data, tx);
                const students = await classEnrollmentService.getStudentsInClass(classId);

                // insert tracking records for teacher
                const trackingRecords: ICreateTrackingRecord[] = flashcards.map(flashcard => {
                    return {
                        userId,
                        topicId,
                        itemId: flashcard.flashcardId,
                        type: 'flashcard',
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
                    const trackingRecords: ICreateTrackingRecord[] = flashcards.map(flashcard => {
                        return {
                            userId: student.studentId,
                            topicId,
                            itemId: flashcard.flashcardId,
                            type: 'flashcard',
                        };
                    });

                    await itemSpacedRepetitionTrackingRepo.initializeTrackingRecords(trackingRecords, tx);
                }
            });
        }
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

    public async updateFlashcardsInTopic(flashcards: IFlashcardUpdateInput[]): Promise<void> {
        await flashcardRepo.updateFlashcards(flashcards);
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
    ): Promise<void> {
        if (flashcardsAdded && flashcardsAdded.length > 0) {
            await this.createFlashcardsForTopic(userId, topicId, flashcardsAdded);
        }

        if (flashcardsUpdated && flashcardsUpdated.length > 0) {
            await this.updateFlashcardsInTopic(flashcardsUpdated);
        }

        if (flashcardsDeleted && flashcardsDeleted.length > 0) {
            await this.deleteFlashcardsByIds(flashcardsDeleted);
        }
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

    // public async getDueFlashcardsForUser(
    //     userId: number,
    //     currentDate: string
    // ): Promise<IFlashcardsLearningForUserReturned> {
    //     const flashcards = await flashcardRepo.getDueFlashcardsForUser(userId, currentDate);
    //     return flashcards;
    // }

    public async getDueFlashcardsForTopicAndUser(
        topicId: number,
        userId: number,
        currentDate: string
    ): Promise<IFlashcard[]> {
        const flashcards = await flashcardRepo.getDueFlashcardsForTopicAndUser(topicId, userId, currentDate);
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
}

export default new FlashcardService();
