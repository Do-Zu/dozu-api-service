import validateData from '@/middleware/validations/validator';
import { createQuestionSchema} from '@/dtos/questions/createQuestion.dto';
import { updateQuestionSchema } from '@/dtos/questions/updateQuestion.dto';
import { submitQuizResultSchema } from '@/dtos/questions/submitQuizResult.dto';

export const validateCreateQuestion = () =>
  validateData({
    selector: (req) => req.body,
    schema: createQuestionSchema,
  });

  export const validateUpdateQuestion = () =>
    validateData({
      selector: (req) => req.body,
      schema: updateQuestionSchema,
  });

  export const validateSubmitQuizResult = () =>
    validateData({
      selector: (req) => req.body,
      schema: submitQuizResultSchema,
    });  
    
    



