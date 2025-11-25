import { z } from 'zod';

// Query schema for getting all API keys
export const getLlmApiKeysQuerySchema = z.object({
  providerId: z
    .string()
    .regex(/^\d+$/, 'Provider ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .optional(),
  providerName: z.string().optional(),
  status: z.enum(['active', 'inactive', 'expired', 'rate_limited']).optional(),
  keyType: z.enum(['free', 'paid']).optional(),
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

export type GetLlmApiKeysQueryDto = z.infer<typeof getLlmApiKeysQuerySchema>;

// Create API key schema
export const createLlmApiKeySchema = z.object({
  providerId: z.number().int().positive(),
  isDefault: z.boolean().default(false),
  priority: z.number().int().default(0),
  index: z.number().int().positive(),
  keyValue: z.string().min(1),
  keyType: z.enum(['free', 'paid']),
  status: z.enum(['active', 'inactive', 'expired', 'rate_limited']).default('active'),
  usageLimitPerDay: z.number().int().positive().nullable().optional(),
});

export type CreateLlmApiKeyDto = z.infer<typeof createLlmApiKeySchema>;

// Update API key schema
export const updateLlmApiKeySchema = z.object({
  providerId: z.number().int().positive().optional(),
  isDefault: z.boolean().optional(),
  priority: z.number().int().optional(),
  index: z.number().int().positive().optional(),
  keyValue: z.string().min(1).optional(),
  keyType: z.enum(['free', 'paid']).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'rate_limited']).optional(),
  usageLimitPerDay: z.number().int().positive().nullable().optional(),
});

export type UpdateLlmApiKeyDto = z.infer<typeof updateLlmApiKeySchema>;

