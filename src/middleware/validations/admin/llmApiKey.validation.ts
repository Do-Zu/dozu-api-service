import { z } from 'zod';
import validator from '@/core/validations/validator';
import {
  getLlmApiKeysQuerySchema,
  createLlmApiKeySchema,
  updateLlmApiKeySchema,
} from '@/dtos/admin/llmApiKey.dto';

export const validateGetLlmApiKeysQuery = () =>
  validator.validate({
    selector: 'query',
    schema: getLlmApiKeysQuerySchema,
  });

export const validateCreateLlmApiKey = () =>
  validator.validate({
    selector: 'body',
    schema: createLlmApiKeySchema,
  });

export const validateUpdateLlmApiKey = () =>
  validator.validate({
    selector: 'body',
    schema: updateLlmApiKeySchema,
  });

export const validateLlmApiKeyIdParam = () =>
  validator.validate({
    selector: 'params',
    schema: z.object({
      id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(val => parseInt(val, 10)),
    }),
  });

