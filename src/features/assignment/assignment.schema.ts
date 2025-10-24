import { z } from 'zod';

export const insertAssignmentSchema = z.object({
    classId: z.number(),
    teacherId: z.number(),
    topicId: z.union([z.number(), z.undefined()]).optional().nullable(),
    title: z.string(),
    content: z.union([z.string(), z.undefined()]).optional(),
    deadline: z
        .union([z.null(), z.coerce.date()])
        .optional()
        .refine(d => d === null || d === undefined || !isNaN(d.getTime()), { message: 'Invalid deadline' }),
    totalGrades: z.union([z.number(), z.undefined()]).optional(),
    status: z
        .union([z.literal('draft'), z.literal('scheduled'), z.literal('published'), z.literal('closed'), z.undefined()])
        .optional(),
    acceptingSubmissions: z.boolean(),
    publishedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
});

export const updateAssignmentSchema = z.object({
    topicId: z.union([z.number(), z.undefined()]).optional().nullable(),
    title: z.string(),
    content: z.union([z.string(), z.undefined()]).optional(),
    deadline: z
        .union([z.null(), z.coerce.date()])
        .optional()
        .refine(d => d === null || d === undefined || !isNaN(d.getTime()), { message: 'Invalid deadline' }),
    totalGrades: z.union([z.number(), z.undefined()]).optional(),
    status: z
        .union([z.literal('draft'), z.literal('scheduled'), z.literal('published'), z.literal('closed'), z.undefined()])
        .optional(),
    acceptingSubmissions: z.boolean(),
    publishedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
    updatedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
});
