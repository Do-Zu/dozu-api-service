import validator from '@/core/validations/validator';
import {
  getLlmModelsQuerySchema,
  createLlmModelSchema,
  updateLlmModelSchema,
} from '@/dtos/admin/llmModel.dto';

export const validateGetLlmModelsQuery = () =>
  validator.validate({
    selector: 'query',
    schema: getLlmModelsQuerySchema,
  });

export const validateCreateLlmModel = () =>
  validator.validate({
    selector: 'body',
    schema: createLlmModelSchema,
  });

export const validateUpdateLlmModel = () =>
  validator.validate({
    selector: 'body',
    schema: updateLlmModelSchema,
  });

