import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import quizClassService from '@/services/class-based-learning/quizClass.service';
import { BadRequest } from '@/core/error';
import requestHelper from '@/core/request/request.helper';

class QuizClassController {
    /**
     * Get complete quiz results for a class
     * GET /class-based-learning/quiz-class/:classQuizId/results?includeAnswers=true
     */
    public async getQuizResults(req: Request, res: Response) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        
        if (isNaN(classQuizId)) {
            throw new BadRequest('Invalid quiz ID');
        }

        // Check if includeAnswers query parameter is set
        const includeAnswers = req.query.includeAnswers === 'true';

        const results = await quizClassService.getQuizResults(classQuizId, includeAnswers);
        SuccessResponse.ok(res, results);
    }

    /**
     * Get quiz statistics only
     * GET /class-based-learning/quiz-class/:classQuizId/statistics
     */
    public async getQuizStatistics(req: Request, res: Response) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        
        if (isNaN(classQuizId)) {
            throw new BadRequest('Invalid quiz ID');
        }

        const statistics = await quizClassService.getQuizStatistics(classQuizId);
        SuccessResponse.ok(res, statistics);
    }

    /**
     * Get student results only
     * GET /class-based-learning/quiz-class/:classQuizId/students?includeAnswers=true
     */
    public async getStudentResults(req: Request, res: Response) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        
        if (isNaN(classQuizId)) {
            throw new BadRequest('Invalid quiz ID');
        }

        // Check if includeAnswers query parameter is set
        const includeAnswers = req.query.includeAnswers === 'true';

        const results = await quizClassService.getStudentQuizResults(classQuizId, includeAnswers);
        SuccessResponse.ok(res, results);
    }

    /**
     * Get quiz monitoring data (for activity monitoring page)
     * GET /class-based-learning/quiz-class/:classQuizId/monitoring
     */
    public async getQuizMonitoringData(req: Request, res: Response) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        
        if (isNaN(classQuizId)) {
            throw new BadRequest('Invalid quiz ID');
        }

        const monitoringData = await quizClassService.getQuizMonitoringData(classQuizId);
        SuccessResponse.ok(res, monitoringData);
    }

    /**
     * Get detailed answers for a specific student
     * GET /class-based-learning/quiz-class/:classQuizId/students/:userId/answers
     */
    public async getStudentAnswers(req: Request, res: Response) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        const userId = parseInt(req.params.userId);
        
        if (isNaN(classQuizId) || isNaN(userId)) {
            throw new BadRequest('Invalid quiz ID or user ID');
        }

        const answers = await quizClassService.getStudentQuizAnswers(classQuizId, userId);
        SuccessResponse.ok(res, answers);
    }

    /**
     * Get question-level analysis
     * GET /class-based-learning/quiz-class/:classQuizId/question-analysis
     */
    public async getQuestionAnalysis(req: Request, res: Response) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        
        if (isNaN(classQuizId)) {
            throw new BadRequest('Invalid quiz ID');
        }

        const analysis = await quizClassService.getQuestionAnalysis(classQuizId);
        SuccessResponse.ok(res, analysis);
    }
}

export default new QuizClassController();

