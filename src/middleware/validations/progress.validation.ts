import { z } from 'zod';
import { ContentType, ProgressStatus } from '@/types/progress/progress.type';

// Schema for creating progress
export const createProgressSchema = z.object({
  userId: z.number().positive('User ID must be a positive number'),
  topicId: z.number().positive('Topic ID must be a positive number'),
  contentType: z.nativeEnum(ContentType, {
    errorMap: () => ({ message: 'Invalid content type' })
  }),
  status: z.nativeEnum(ProgressStatus).optional().default(ProgressStatus.NOT_STARTED),
  completionPercentage: z.number().min(0).max(100).optional().default(0),
  score: z.number().min(0).max(100).optional(),
  metadata: z.object({
    attempts: z.number().min(0).optional(),
    timeSpent: z.number().min(0).optional(),
    lastPosition: z.number().min(0).optional(),
    answers: z.record(z.any()).optional(),
    notes: z.string().optional(),
  }).optional(),
});

// Schema for updating progress
export const updateProgressSchema = z.object({
  status: z.nativeEnum(ProgressStatus).optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  lastInteractionAt: z.date().optional(),
  metadata: z.object({
    attempts: z.number().min(0).optional(),
    timeSpent: z.number().min(0).optional(),
    lastPosition: z.number().min(0).optional(),
    answers: z.record(z.any()).optional(),
    notes: z.string().optional(),
  }).partial().optional(),
});

// Schema for query parameters
export const progressQuerySchema = z.object({
  userId: z.number().optional(),
  topicId: z.number().optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  status: z.nativeEnum(ProgressStatus).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  minCompletionPercentage: z.number().min(0).max(100).optional(),
  maxCompletionPercentage: z.number().min(0).max(100).optional(),
});

export type CreateProgressData = z.infer<typeof createProgressSchema>;
export type UpdateProgressData = z.infer<typeof updateProgressSchema>;
export type ProgressQueryData = z.infer<typeof progressQuerySchema>;
