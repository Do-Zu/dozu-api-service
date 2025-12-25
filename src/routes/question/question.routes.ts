import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { questionController } from '@/controllers/question/question.controller';
import { validateTopicId } from '@/middleware/validations/flashcard.validation';
import { validateBatchQuestions } from '@/middleware/validations/question.validation';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);

router.get('/', validateTopicId(), questionController.handleGetAllQuestionsForTopic);
router.post('/batch', validateTopicId(), validateBatchQuestions() ,questionController.handleBatchQuestionsForTopic);
router.get('/health', validateTopicId(), questionController.handleGetQuestionsHealthForTopic);

registerRoute('/questions', router, {
  description: 'Manage quiz questions',
  version: 'v1',
  isEnabled: true,
});

export const questionRoutes = router;
