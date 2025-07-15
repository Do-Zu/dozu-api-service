import validateData from '@/middleware/validations/validator';
import { batchQuestionSchema } from '@/dtos/question/ question.dto';

export const validateBatchQuestions = () =>
  validateData({
    selector: req => req.body,
    schema: batchQuestionSchema,
  });
