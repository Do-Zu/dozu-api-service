import { quizRepo } from '@/repositories/quiz/quiz.repo';
import { QuizGenerateDto, QuizCreateDto } from '@/dtos/quiz/quiz.dto';
import { applySM2ForQuestion } from '@/utils/quiz/quizSm2Helper';
import { fisherYatesShuffle } from '@/utils/quiz/shuffle';
import { IQuizResultPayload } from '@/types/quiz/quiz.type';
import { BadRequest } from '@/core/error';
import { ContentType } from '@/types/progress/progress.type';
import { progressService } from '@/services/progress/progress.service';
import pointsService from '@/services/gamification/points.service';
import topicRepo from '@/repositories/topic.repo';

class QuizService {
    constructor() {}
    async handleGenerateQuiz(dto: QuizGenerateDto, userId: number) {
        const { topicId, type, initialConfig } = dto;
        switch (type) {
            case 'initial': {
                let questions = await quizRepo.getInitialQuiz(topicId);

                const shouldShuffle = initialConfig?.shuffle ?? true;
                if (shouldShuffle) {
                    questions = fisherYatesShuffle(questions);
                }

                if (initialConfig?.limit) {
                    questions = questions.slice(0, initialConfig.limit);
                }

                return questions;
            }
            case 'review':
                return quizRepo.getReviewQuiz(topicId, userId);
            case 'weak':
                return quizRepo.getWeakQuiz(topicId, userId);
            case 'new':
                return quizRepo.getNewQuiz(topicId, userId);
            case 'learning': {
                return quizRepo.getLearningQuiz(topicId, userId);
            }
            case 'wrong':
                return quizRepo.getWrongQuiz(topicId, userId);
            default:
                throw new Error('Invalid quiz type');
        }
    }

    async handleCreateQuiz(data: QuizCreateDto) {
        return await quizRepo.createQuizWithQuestions(data);
    }

    async getQuizById(quizId: number) {
        const result = await quizRepo.getQuizById(quizId);
        if (!result) throw new BadRequest('Quiz not found');
        return result;
    }

    async handleSubmitQuiz(userId: number, quizId: number, results: IQuizResultPayload[]) {
        const correctAnswersCount = results.filter(r => r.correct).length;
        const totalQuestions = results.length;
        const score = Math.round((correctAnswersCount / totalQuestions) * 100);

        // Record quiz results and each question
        const quizResultId = await quizRepo.saveQuizAndQuestionResults(userId, quizId, results, correctAnswersCount);

        // Get topicId for this quiz
        const topicId = await quizRepo.getTopicIdByQuizId(quizId);
        
        // Create progress record for quiz completion
        if (topicId !== -1) {
            try {
                await progressService.updateLearningProgress({
                    userId,
                    topicId: topicId.toString(),
                    contentType: ContentType.QUIZ,
                    timeSpent: 0, // Will be updated by client
                    isCompleted: true,
                    score: score, // Store score in main field
                    metadata: {
                        attempts: 1,
                        answers: { score, correctAnswersCount, totalQuestions }
                    }
                });
            } catch (error) {
                console.error('Failed to create quiz progress record:', error);
            }
        }

        // Award points for quiz completion
        try {
            // Get classId from topic
            if (topicId !== -1) {
                const topic = await topicRepo.getTopicById(topicId);
                if (topic?.classId) {
                    await pointsService.awardQuizCompletion(userId, topic.classId, quizId, score);
                }
            }
        } catch (error) {
            console.error('Failed to award quiz completion points:', error);
        }

        // SM-2 for each question
        for (const result of results) {
            const questionTopicId = await quizRepo.getTopicIdByQuestionId(result.questionId);
            if (questionTopicId === -1) continue;

            await applySM2ForQuestion(userId, result.questionId, questionTopicId, result.correct, result.confidence);
        }
        return quizResultId;
    }

    async handleGetQuizHistory(topicId: number, userId: number) {
        return await quizRepo.getQuizHistoryByTopic(topicId, userId);
    }

    async getQuizResultDetail(quizResultId: number) {
        const result = await quizRepo.getQuizResultDetail(quizResultId);
        if (!result) throw new BadRequest('Quiz result not found');
        return result;
    }

    async getQuizStatistics(topicId: number) {
        return await quizRepo.getQuizStatistics(topicId);
    }

    async getQuizRecommendation(topicId: number, userId: number) {
    const counts = await quizRepo.getQuizTypeCounts(topicId, userId);

    let recommendedType: 'wrong' | 'review' | 'weak' | 'learning' | 'new' | null = null;
    let reason = '';

    if (counts.wrong > 0) {
        recommendedType = 'wrong';
        reason = 'You recently answered some questions incorrectly';
    } else if (counts.review > 0) {
        recommendedType = 'review';
        reason = 'Some questions are scheduled for review';
    } else if (counts.weak > 0) {
        recommendedType = 'weak';
        reason = 'You have weak questions that need more practice';
    } else if (counts.learning > 0) {
        recommendedType = 'learning';
        reason = 'Continue your learning progress';
    } else if (counts.new > 0) {
        recommendedType = 'new';
        reason = 'New questions are ready to learn';
    }

    return {
        recommendedType,
        reason,
        counts,
    };
}

}

export const quizService = new QuizService();
