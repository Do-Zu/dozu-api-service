import { z } from 'zod';

export const createQuestionSchema = z.object({
  topicId: z.number(),
  questionText: z.string().min(10).max(300),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  status: z.enum(['new', 'learning', 'review']).optional()
});

export type CreateQuestionDto = z.infer<typeof createQuestionSchema>;
