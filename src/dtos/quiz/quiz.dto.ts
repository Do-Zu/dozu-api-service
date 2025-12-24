import { z } from 'zod';

export const quizTypes = ['initial', 'new', 'learning', 'review', 'wrong', 'weak'] as const;

const confidenceSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const initialQuizConfigSchema = z.object({
    limit: z.coerce.number().min(1).optional(),
    shuffle: z.coerce.boolean().optional().default(true),
});

export const quizGenerateSchema = z.object({
    topicId: z.coerce.number(),
    type: z.enum(quizTypes),

    // Only used when type === 'initial'
    initialConfig: initialQuizConfigSchema.optional(),
});

export const quizSubmitSchema = z.object({
    quizId: z.number(),
    results: z.array(
        z.object({
            questionId: z.number(),
            correct: z.boolean(),
            userAnswerIndex: z.number().nullable(),
            confidence: confidenceSchema.optional(), 
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