import { quizRepo } from '@/repositories/quiz/quiz.repo';
import { QuizGenerateDto, QuizCreateDto } from '@/dtos/quiz/quiz.dto';
import { applySM2ForQuestion } from '@/utils/quiz/quizSm2Helper';
import { fisherYatesShuffle } from '@/utils/quiz/shuffle'; 
import { IQuizResultPayload } from '@/types/quiz/quiz.type';
import { BadRequest } from '@/core/error';
import { ContentType } from '@/types/progress/progress.type';
import { progressService } from '@/services/progress/progress.service';
import pointsService from '@/services/gamification/points.service';

class QuizService {
    constructor() {}
    async handleGenerateQuiz(type: QuizGenerateDto['type'], topicId: number, userId: number) {
        switch (type) {
            case 'initial':
                return quizRepo.getInitialQuiz(topicId);
            case 'review':
                return quizRepo.getReviewQuiz(topicId, userId);
            case 'ef-low':
                return quizRepo.getLowEFQuiz(topicId, userId);
            case 'new':
                return quizRepo.getNewQuiz(topicId);
            case 'random': {
                const allQuestions = await quizRepo.getInitialQuiz(topicId);
                const shuffled = fisherYatesShuffle(allQuestions);
                const selected = shuffled.slice(0, 5);
                return selected;
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
            await pointsService.awardQuizCompletion(userId, quizId, score);
        } catch (error) {
            console.error('Failed to award quiz completion points:', error);
        }

        // SM-2 for each question
        for (const result of results) {
            const questionTopicId = await quizRepo.getTopicIdByQuestionId(result.questionId);
            if (questionTopicId === -1) continue;

            await applySM2ForQuestion(userId, result.questionId, questionTopicId, result.correct);
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
}

export const quizService = new QuizService();
