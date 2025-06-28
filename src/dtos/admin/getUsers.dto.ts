import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform(val => val === 'true');

export const getUsersQuerySchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  isActive: booleanString.optional(),
  isVerified: booleanString.optional(),
  hasCompletedOnboarding: booleanString.optional(),
});

export type GetUsersQueryDto = z.infer<typeof getUsersQuerySchema>;
