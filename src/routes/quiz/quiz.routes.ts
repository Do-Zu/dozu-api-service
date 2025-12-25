import { Router } from 'express';
import { quizController } from '@/controllers/quiz/quiz.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import {
    validateQuizGenerateQuery,
    validateQuizSubmit,
    validateQuizCreate,
    validateQuizRecommendQuery,
} from '@/middleware/validations/quiz.validation';
import { validateTopicId } from '@/middleware/validations/flashcard.validation';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/statistics', validateTopicId(), quizController.handleGetQuizStatistics);
router.get('/generate', validateQuizGenerateQuery(), quizController.handleGenerateQuiz);
router.post('/submit', validateQuizSubmit(), quizController.handleSubmitQuiz);
router.post('/create', validateQuizCreate(), quizController.handleCreateQuiz);
router.get('/recommend', validateQuizRecommendQuery(), quizController.handleGetQuizRecommendation);
router.get('/history', validateTopicId(), quizController.handleGetQuizHistory);
router.get('/history/:quizResultId', quizController.handleGetQuizResultDetail);
router.get('/:quizId', quizController.handleGetQuizById);

registerRoute('/quiz', router, {
    description: 'Generate quiz by topic and type',
    version: 'v1',
    isEnabled: true,
});

export const quizRoutes = router;
