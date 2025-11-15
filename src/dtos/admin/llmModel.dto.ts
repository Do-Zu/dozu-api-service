import { z } from 'zod';

// Query schema for getting all models
export const getLlmModelsQuerySchema = z.object({
  providerId: z
    .string()
    .regex(/^\d+$/, 'Provider ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .optional(),
  providerName: z.string().optional(),
  isAvailable: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  isDefault: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
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
  search: z.string().optional(),
});

export type GetLlmModelsQueryDto = z.infer<typeof getLlmModelsQuerySchema>;

// Create model schema
export const createLlmModelSchema = z.object({
  providerId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  priority: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  description: z.string().optional(),
});

export type CreateLlmModelDto = z.infer<typeof createLlmModelSchema>;

// Update model schema
export const updateLlmModelSchema = z.object({
  providerId: z.number().int().positive().optional(),
  name: z.string().min(1).max(100).optional(),
  priority: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export type UpdateLlmModelDto = z.infer<typeof updateLlmModelSchema>;

