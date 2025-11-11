import { z } from 'zod';

// Query schema for getting all models
export const getLlmModelsQuerySchema = z.object({
  providerId: z.string().transform(val => parseInt(val)).optional(),
  providerName: z.string().optional(),
  isAvailable: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  isDefault: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
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

