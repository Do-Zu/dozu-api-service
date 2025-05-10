import { z } from 'zod';

export const updateQuestionSchema = z.object({
  questionText: z.string().min(1),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3)
});

export type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>;
