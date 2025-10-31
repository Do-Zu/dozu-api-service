import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import { authMiddleware, validateTeacher } from '@/middleware/auth.middleware';
import paramsValidator from '@/core/validations/params.validator';
import quizClassController from '@/controllers/class-based-learning/quizClass.controller';
import quizClassMiddleware from '@/middleware/class-based-learning/quizClass.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);
router.use(validateTeacher);

// All quiz class endpoints require quiz ID param validation and ownership verification
const verifyQuizId = [
    paramsValidator.validateId('classQuizId'),
    quizClassMiddleware.verifyQuizById,
    quizClassMiddleware.verifyTeacherOwnsQuiz,
];

router.get('/:classQuizId/results', ...verifyQuizId, quizClassController.getQuizResults);
router.get('/:classQuizId/statistics', ...verifyQuizId, quizClassController.getQuizStatistics);
router.get('/:classQuizId/students', ...verifyQuizId, quizClassController.getStudentResults);
router.get('/:classQuizId/monitoring', ...verifyQuizId, quizClassController.getQuizMonitoringData);
router.get('/:classQuizId/students/:userId/answers', ...verifyQuizId, quizClassController.getStudentAnswers);
router.get('/:classQuizId/question-analysis', ...verifyQuizId, quizClassController.getQuestionAnalysis);

registerRoute('/quiz-class', router, {
    description: 'Quiz class API for managing quiz results and statistics in classes',
    version: 'v1',
    isEnabled: true,
});

export const quizClassRoutes = router;

