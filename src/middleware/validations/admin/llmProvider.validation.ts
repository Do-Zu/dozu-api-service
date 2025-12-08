import { z } from 'zod';
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

export const validateIdParam = () =>
  validator.validate({
    selector: 'params',
    schema: z.object({
      id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(val => parseInt(val, 10)),
    }),
  });

