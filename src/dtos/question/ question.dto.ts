import { z } from 'zod';

export const questionSchema = z.object({
    id: z.number().optional(),
    questionText: z.string(),
    choices: z.array(z.string()).min(1),
    correctIndex: z.number().min(0),
    questionType: z.string().optional().nullable(),
    hint: z.string().optional().nullable(),
    explain: z.string().optional().nullable(),
});

export const batchQuestionSchema = z.object({
    //   topicId: z.number(),
    insert: z.array(questionSchema).optional(),
    update: z.array(questionSchema).optional(),
    delete: z.array(z.number()).optional(),
});

export type BatchQuestionDto = z.infer<typeof batchQuestionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionBatchPayload = Omit<BatchQuestionDto, 'topicId'>;
