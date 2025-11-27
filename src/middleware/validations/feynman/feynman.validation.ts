import validator from '@/core/validations/validator';
import { z, ZodObject } from 'zod';

export const compareSimilarityRequestSchema = z.object({
    topicId: z.number(),
    method: z.string().optional(),
    type: z.string().min(1),
    pattern: z.string().min(1),
    query: z.string().min(1),
    questionType: z.string(),
    question: z.string().min(1),
    metaData: z.record(z.unknown()).optional(),
});

export const validateCompareSimilarQuestionAnswer = () => {
    return validator.validate<ZodObject<any, any>>({ selector: 'body', schema: compareSimilarityRequestSchema });
};

export type ICompareSimilarityRequest = z.infer<typeof compareSimilarityRequestSchema>;
