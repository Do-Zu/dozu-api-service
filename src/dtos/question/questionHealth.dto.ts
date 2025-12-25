import { z } from 'zod';

export const healthLevelSchema = z.enum(['critical', 'weak', 'fair', 'healthy', 'mastered']);
export type HealthLevel = z.infer<typeof healthLevelSchema>;

export const questionHealthSchema = z.object({
  questionId: z.number(),
  topicId: z.number(),
  questionText: z.string(),
  choices: z.array(z.string()),
  correctIndex: z.number(),
  questionType: z.string().nullable().optional(),
  explain: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),

  // SR info
  status: z.enum(['untracked', 'new', 'learning', 'review', 'relearning']),
  healthScore: z.number().min(0).max(100),
  healthLevel: healthLevelSchema,

  metrics: z.object({
    easinessFactor: z.number().nullable().optional(),
    repetitionNumber: z.number().nullable().optional(),
    reviewInterval: z.number().nullable().optional(),
    lastReviewed: z.string().nullable().optional(),
    nextReview: z.string().nullable().optional(),
    overdueDays: z.number().nullable().optional(),
  }),

  reasons: z.array(z.string()),
});

export type QuestionHealthDTO = z.infer<typeof questionHealthSchema>;
