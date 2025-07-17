import { quizRepo } from '@/repositories/quiz/quiz.repo';
import { QuizGenerateDto } from '@/dtos/quiz/quiz.dto';
import { applySM2ForQuestion } from '@/utils/quiz/quizSm2Helper';
import { IQuizResultPayload } from '@/types/quiz/quiz.type';
import { BadRequest } from '@/core/error'; 

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
            case 'random':
                return quizRepo.getRandomQuiz(topicId);
            case 'wrong':
                return quizRepo.getWrongQuiz(topicId, userId);
            default:
                throw new Error('Invalid quiz type');
        }
    }

    async handleSubmitQuiz(userId: number, quizId: number, results: IQuizResultPayload[]) {
        const correctAnswersCount = results.filter(r => r.correct).length;

        // Record quiz results and each question
        await quizRepo.saveQuizAndQuestionResults(userId, quizId, results, correctAnswersCount);

        // SM-2 for each question
        for (const result of results) {
            const topicId = await quizRepo.getTopicIdByQuestionId(result.questionId);
            if (topicId === -1) continue;

            await applySM2ForQuestion(userId, result.questionId, topicId, result.correct);
        }
    }

    async handleGetQuizHistory(topicId: number) {
        return await quizRepo.getQuizHistoryByTopic(topicId);
    }

    async getQuizResultDetail(quizResultId: number) {
        const result = await quizRepo.getQuizResultDetail(quizResultId);
        if (!result) throw new BadRequest('Quiz result not found');
        return result;
    }
}

export const quizService = new QuizService();
