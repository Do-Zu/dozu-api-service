import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '@/routes/register.routes';
import { classQuizStudentController } from '@/controllers/class-based-learning/class-quiz/classQuizStudent.controller';
// import {
//   validateSaveAnswer,
//   validateSubmitAttempt,
// } from '@/middleware/validations/class-quiz/classQuiz.validation';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);

router.get('/class-quizzes/:classQuizId/playable', classQuizStudentController.getPlayableMeta);
router.post('/class-quizzes/:classQuizId/attempts', classQuizStudentController.startAttempt);
router.post('/class-quizzes/:classQuizId/attempts/:attemptId/answers', classQuizStudentController.saveAnswer);
router.post('/class-quizzes/:classQuizId/attempts/:attemptId/submit', classQuizStudentController.submitAttempt);
router.get('/me/classes/:classId/quizzes', classQuizStudentController.myAttempts);
router.get('/class-quizzes/:classQuizId/attempts/:attemptId', classQuizStudentController.attemptDetail);

registerRoute('/student/class-quiz', router, {
  description: 'Student-facing APIs for class quizzes',
  version: 'v1',
  isEnabled: true,
});

export default router;
