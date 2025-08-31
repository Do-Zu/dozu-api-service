import { z } from 'zod';

// Create comment validation schema
export const createCommentSchema = z.object({
    topicId: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive('Topic ID must be a positive integer'))
        .or(z.number().int().positive('Topic ID must be a positive integer')),

    nodeId: z.coerce.string().trim().min(1, 'nodeId is required'),
    typeNode: z.enum(['mindmap', 'flashcard', 'quiz'], {
        errorMap: () => ({ message: 'Type node must be one of: mindmap, flashcard, quiz' }),
    }),
    content: z.string().trim().min(1, 'Content cannot be empty').max(2000, 'Content cannot exceed 2000 characters'),
    author: z.object({
        user_id: z
            .string()
            .transform(val => parseInt(val))
            .pipe(z.number().int().positive('User ID must be a positive integer'))
            .or(z.number().int().positive('User ID must be a positive integer')),
        name: z
            .string()
            .min(2, 'Name must be at least 2 characters long')
            .max(100, 'Name cannot exceed 100 characters'),
        avatar: z.string().url('Avatar must be a valid URL').optional(),
    }),
    parentCmtId: z.string().nullable().optional().or(z.number().int().positive().nullable().optional()),
});

// Update comment validation schema
export const updateCommentSchema = z.object({
    content: z.string().min(1, 'Content cannot be empty').max(2000, 'Content cannot exceed 2000 characters'),
});

// Query parameters for getting comments
export const getCommentsQuerySchema = z.object({
    nodeId: z.string().optional(),
    typeNode: z.enum(['mindmap', 'flashcard', 'quiz']).optional(),
    parentCmtId: z.string().optional().or(z.number().int().positive().optional()),
    level: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().min(0))
        .optional()
        .or(z.number().int().optional()),
    page: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive())
        .optional()
        .or(z.number().int().positive().optional()),
    limit: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive().max(100))
        .optional()
        .or(z.number().int().positive().optional()),
    includeReplies: z.enum(['true', 'false']).optional(),
});
