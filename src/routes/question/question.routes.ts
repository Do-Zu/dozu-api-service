// src/routes/questions/question.routes.ts
import express from 'express';
import { questionController } from '@/controllers/question/questions.controller';
import { validateCreateQuestion, validateUpdateQuestion, validateSubmitQuizResult } from '@/middleware/validations/question.validaton';
import { registerRoute } from '@/routes/register.routes';

const router = express.Router();

router.post('/', validateCreateQuestion(), questionController.create); //tạo
router.get('/topic/:topicId', questionController.getByTopic); //lấy cả
router.get('/topic/:topicId/quiz', questionController.getQuizQuestions); //lấy theo ID
router.get('/:id', questionController.getById); // lấy một câu
router.put('/:id', validateUpdateQuestion(), questionController.update); // update 
router.delete('/:id', questionController.delete); //xoá
router.post('/quiz-results', validateSubmitQuizResult(), questionController.submitQuizResult); //nộp bài 


registerRoute('/question', router, {
    description: 'Manual quiz: CRUD question + submit result',
    version: 'v1',
    isEnabled: true
})

export const questionRoutes = router;
