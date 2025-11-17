import { z } from 'zod';
import validator from '@/core/validations/validator';
import {
  getLlmApiKeyModelsQuerySchema,
  createLlmApiKeyModelSchema,
  updateLlmApiKeyModelSchema,
} from '@/dtos/admin/llmApiKeyModel.dto';

export const validateGetLlmApiKeyModelsQuery = () =>
  validator.validate({
    selector: 'query',
    schema: getLlmApiKeyModelsQuerySchema,
  });

export const validateCreateLlmApiKeyModel = () =>
  validator.validate({
    selector: 'body',
    schema: createLlmApiKeyModelSchema,
  });

export const validateUpdateLlmApiKeyModel = () =>
  validator.validate({
    selector: 'body',
    schema: updateLlmApiKeyModelSchema,
  });

export const validateLlmApiKeyModelIdParam = () =>
  validator.validate({
    selector: 'params',
    schema: z.object({
      id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(val => parseInt(val, 10)),
    }),
  });

