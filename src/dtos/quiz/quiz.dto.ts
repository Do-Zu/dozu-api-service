import { z } from 'zod';

export const quizTypes = ['initial', 'review', 'ef-low', 'new', 'random', 'wrong'] as const;

export const quizGenerateSchema = z.object({
  topicId: z.coerce.number(),
  type: z.enum(quizTypes),
});

export const quizSubmitSchema = z.object({
  quizId: z.number(),
  results: z.array(
    z.object({
      questionId: z.number(),
      correct: z.boolean(),
      userAnswerIndex: z.number().nullable(),
    })
  ),
});

export const quizCreateSchema = z.object({
  topicId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
});


export type QuizGenerateDto = z.infer<typeof quizGenerateSchema>;
export type QuizSubmitDto = z.infer<typeof quizSubmitSchema>;
export type QuizCreateDto = z.infer<typeof quizCreateSchema>;