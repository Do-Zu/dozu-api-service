import validator from '@/core/validations/validator';
import { batchQuestionSchema } from '@/dtos/question/ question.dto';

export const validateBatchQuestions = () =>
  validator.validate({
    selector: 'body',
    schema: batchQuestionSchema,
  });
