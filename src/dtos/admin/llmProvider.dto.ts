import { z } from 'zod';

// Query schema for getting all providers
export const getLlmProvidersQuerySchema = z.object({
  isAvailable: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  isDefault: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  page: z.string().default('1'),
  limit: z.string().default('50'),
  search: z.string().optional(),
});

export type GetLlmProvidersQueryDto = z.infer<typeof getLlmProvidersQuerySchema>;

// Create provider schema
export const createLlmProviderSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  index: z.number().int().min(0),
  description: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
});

export type CreateLlmProviderDto = z.infer<typeof createLlmProviderSchema>;

// Update provider schema
export const updateLlmProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  index: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')).nullable(),
});

export type UpdateLlmProviderDto = z.infer<typeof updateLlmProviderSchema>;

