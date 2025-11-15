import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware } from '@/middleware/auth.middleware';
import { registerRoute } from '@/routes/register.routes';
import { classQuizTeacherController } from '@/controllers/class-based-learning/class-quiz/classQuizTeacher.controller';
import {
  validateCreateClassQuiz,
  validateUpsertDraft,
  validateUpdateSettings,
  validateSchedule,
  validateListClassQuizzes,
} from '@/middleware/validations/class-quiz/classQuiz.validation';

const router = Router(); 
globalAsyncHandler(router);
router.use(authMiddleware);

router.post('/classes/:classId/quizzes', validateCreateClassQuiz(), classQuizTeacherController.createClassQuiz);
router.put('/class-quizzes/:classQuizId/draft', validateUpsertDraft(), classQuizTeacherController.upsertDraft);
router.get('/class-quizzes/:classQuizId/draft', classQuizTeacherController.getDraft);
router.get('/class-quizzes/:classQuizId', classQuizTeacherController.getClassQuiz);
router.patch('/class-quizzes/:classQuizId/settings', validateUpdateSettings(), classQuizTeacherController.updateSettings);
router.post('/class-quizzes/:classQuizId/schedule', validateSchedule(), classQuizTeacherController.schedule);
router.post('/class-quizzes/:classQuizId/publish', classQuizTeacherController.publish);
router.post('/class-quizzes/:classQuizId/pause', classQuizTeacherController.pause);
router.post('/class-quizzes/:classQuizId/resume', classQuizTeacherController.resume);
router.post('/class-quizzes/:classQuizId/close', classQuizTeacherController.close);
router.get('/classes/:classId/quizzes', validateListClassQuizzes(), classQuizTeacherController.listClassQuizzes);

registerRoute('/teacher/class-quiz', router, {
  description: 'Teacher-facing APIs for class quizzes',
  version: 'v1',
  isEnabled: true,
});

export default router;
