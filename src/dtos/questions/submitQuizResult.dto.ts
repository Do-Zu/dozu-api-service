import { z } from 'zod';

export const submitQuizResultSchema = z.object({
    topicId: z.number().int().positive(),
    answers: z.array(
      z.object({
        questionId: z.number().int().positive(),
        userAnswer: z.number().int().min(0).max(3),
      })
    ).min(1)
  });
  

export type SubmitQuizResultDto = z.infer<typeof submitQuizResultSchema>;