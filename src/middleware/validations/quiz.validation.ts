import validator from '@/core/validations/validator';
import { quizGenerateSchema, quizSubmitSchema, quizCreateSchema } from '@/dtos/quiz/quiz.dto';

export const validateQuizGenerateQuery = () =>
  validator.validate({ 
    selector: 'query',
    schema: quizGenerateSchema 
});

export const validateQuizSubmit = () =>
  validator.validate({
    selector: 'body',
    schema: quizSubmitSchema,
  });

export const validateQuizCreate = () =>
  validator.validate({ 
    selector: 'body',
    schema: quizCreateSchema 
  });  