import validator from '@/core/validations/validator';
import {
  getLlmProvidersQuerySchema,
  createLlmProviderSchema,
  updateLlmProviderSchema,
} from '@/dtos/admin/llmProvider.dto';

export const validateGetLlmProvidersQuery = () =>
  validator.validate({
    selector: 'query',
    schema: getLlmProvidersQuerySchema,
  });

export const validateCreateLlmProvider = () =>
  validator.validate({
    selector: 'body',
    schema: createLlmProviderSchema,
  });

export const validateUpdateLlmProvider = () =>
  validator.validate({
    selector: 'body',
    schema: updateLlmProviderSchema,
  });

