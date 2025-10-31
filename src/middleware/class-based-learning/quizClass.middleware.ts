import { Forbidden, NotFoundError } from '@/core/error';
import { NextFunction, Request, Response } from 'express';
import requestHelper from '@/core/request/request.helper';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import quizClassRepo from '@/repositories/class-based-learning/quizClass.repo';
import { IClassQuizResource } from '@/types/class-based-learning/quizClass.type';

class QuizClassMiddleware {
    /**
     * Verify that a quiz exists and attach it to the request
     */
    public async verifyQuizById(req: Request, _res: Response, next: NextFunction) {
        const classQuizId = requestHelper.getIdParam(req, 'classQuizId');
        const quiz = await quizClassRepo.getClassQuizById(classQuizId);
        
        if (quiz) {
            requestHelper.setResource(req, 'classQuiz', quiz);
            next();
        } else {
            throw new NotFoundError('Quiz not found');
        }
    }

    /**
     * Verify that the current user is the teacher who owns this quiz
     */
    public async verifyTeacherOwnsQuiz(req: Request, _res: Response, next: NextFunction) {
        const userId = getUserIdFromRequest(req);
        const quiz = requestHelper.getResource(req, 'classQuiz') as IClassQuizResource | null;

        if (!quiz) {
            throw new NotFoundError('Quiz resource not found in request');
        }

        if (quiz.teacherId !== userId) {
            throw new Forbidden('Forbidden: You are not the owner of this quiz!');
        }

        next();
    }

    /**
     * Combined middleware: verify quiz exists and teacher owns it
     */
    public async verifyQuizAndOwnership(req: Request, res: Response, next: NextFunction) {
        // First verify the quiz exists
        await this.verifyQuizById(req, res, async (err) => {
            if (err) {
                return next(err);
            }
            // Then verify ownership
            await this.verifyTeacherOwnsQuiz(req, res, next);
        });
    }
}

export default new QuizClassMiddleware();

