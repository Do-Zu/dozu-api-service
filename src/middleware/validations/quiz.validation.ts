import validateData from '@/middleware/validations/validator';
import { quizGenerateSchema, quizSubmitSchema, quizCreateSchema } from '@/dtos/quiz/quiz.dto';

export const validateQuizGenerateQuery = () =>
  validateData({ 
    selector: (req) => req.query, 
    schema: quizGenerateSchema 
});

export const validateQuizSubmit = () =>
  validateData({
    selector: req => req.body,
    schema: quizSubmitSchema,
  });

export const validateQuizCreate = () =>
  validateData({ 
    selector: req => req.body, 
    schema: quizCreateSchema 
  });  