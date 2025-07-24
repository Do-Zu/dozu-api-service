import { Request, Response } from 'express';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { SuccessResponse } from '@/core/success';
import { quizService } from '@/services/quiz/quiz.service';
import topicService from '@/services/topic/topic.service';
import { QuizGenerateDto, QuizSubmitDto } from '@/dtos/quiz/quiz.dto';
import { BadRequest } from '@/core/error';

class QuizController {
    constructor() {}

    async handleGenerateQuiz(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const { topicId, type } = req.query as unknown as QuizGenerateDto;

        const isExisted = await topicService.doesTopicExist(Number(topicId));
        if (!isExisted) throw new BadRequest('Topic does not exist');

        const questions = await quizService.handleGenerateQuiz(type, Number(topicId), userId);
        SuccessResponse.ok(res, questions);
    }

    async handleCreateQuiz(req: Request, res: Response): Promise<void> {
        const { topicId, name, description } = req.body;

        const quizId = await quizService.handleCreateQuiz({
            topicId,
            name,
            description,
        });

        SuccessResponse.created(res, { quizId });
    }

    async handleGetQuizById(req: Request, res: Response): Promise<void> {
        const quizId = parseInt(req.params.quizId);
        if (isNaN(quizId)) throw new BadRequest('Invalid quizId');

        const quiz = await quizService.getQuizById(quizId);
        SuccessResponse.ok(res, quiz);
    }

    async handleSubmitQuiz(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const { quizId, results }: QuizSubmitDto = req.body;

        const quizResultId = await quizService.handleSubmitQuiz(userId, quizId, results);
        SuccessResponse.created(res, { message: 'Quiz submitted successfully', quizResultId });
    }

    async handleGetQuizHistory(req: Request, res: Response): Promise<void> {
        const topicId = Number(req.query.topicId);

        const isExisted = await topicService.doesTopicExist(topicId);
        if (!isExisted) throw new BadRequest('Topic does not exist');

        const history = await quizService.handleGetQuizHistory(Number(topicId));
        SuccessResponse.ok(res, history);
    }

    async handleGetQuizResultDetail(req: Request, res: Response): Promise<void> {
        const { quizResultId } = req.params;

        const parsedId = parseInt(quizResultId);
        if (isNaN(parsedId)) throw new BadRequest('Invalid quizResultId');

        const data = await quizService.getQuizResultDetail(parsedId);
        SuccessResponse.ok(res, data);
    }

    async handleGetQuizStatistics(req: Request, res: Response): Promise<void> {
        const topicId = Number(req.query.topicId);

        const isExisted = await topicService.doesTopicExist(topicId);
        if (!isExisted) throw new BadRequest('Topic does not exist');

        const stats = await quizService.getQuizStatistics(topicId);
        SuccessResponse.ok(res, stats);
    }
}

export const quizController = new QuizController();
