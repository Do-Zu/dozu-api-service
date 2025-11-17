import { z } from 'zod';

// Query schema for getting all API key-model relations
export const getLlmApiKeyModelsQuerySchema = z.object({
  apiKeyId: z
    .string()
    .regex(/^\d+$/, 'API Key ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .optional(),
  modelId: z
    .string()
    .regex(/^\d+$/, 'Model ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .optional(),
  providerId: z
    .string()
    .regex(/^\d+$/, 'Provider ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a valid number')
    .default('1')
    .transform(val => parseInt(val, 10)),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a valid number')
    .default('50')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

export type GetLlmApiKeyModelsQueryDto = z.infer<typeof getLlmApiKeyModelsQuerySchema>;

// Create API key-model relation schema
export const createLlmApiKeyModelSchema = z.object({
  apiKeyId: z.number().int().positive(),
  modelId: z.number().int().positive(),
  requestPerMinute: z.number().int().positive(),
  requestPerDay: z.number().int().positive(),
});

export type CreateLlmApiKeyModelDto = z.infer<typeof createLlmApiKeyModelSchema>;

// Update API key-model relation schema
export const updateLlmApiKeyModelSchema = z.object({
  apiKeyId: z.number().int().positive().optional(),
  modelId: z.number().int().positive().optional(),
  requestPerMinute: z.number().int().positive().optional(),
  requestPerDay: z.number().int().positive().optional(),
});

export type UpdateLlmApiKeyModelDto = z.infer<typeof updateLlmApiKeyModelSchema>;

