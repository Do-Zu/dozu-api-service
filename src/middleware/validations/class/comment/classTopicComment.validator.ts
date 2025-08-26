import { z } from 'zod';

// Create comment validation schema
export const createCommentSchema = z.object({
    topicId: z.number().int().positive('Topic ID must be a positive integer'),
    groupId: z.number().int().positive('Group ID must be a positive integer'),
    nodeId: z.number().int().positive('Node ID must be a positive integer'),
    typeNode: z.enum(['mindmap', 'flashcard', 'quiz'], {
        errorMap: () => ({ message: 'Type node must be one of: mindmap, flashcard, quiz' }),
    }),
    content: z.string().min(1, 'Content cannot be empty').max(2000, 'Content cannot exceed 2000 characters'),
    parentCmtId: z.number().int().positive().optional(),
});

// Update comment validation schema
export const updateCommentSchema = z.object({
    content: z.string().min(1, 'Content cannot be empty').max(2000, 'Content cannot exceed 2000 characters'),
});

// Query parameters for getting comments
export const getCommentsQuerySchema = z.object({
    nodeId: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive())
        .optional(),
    typeNode: z.enum(['mindmap', 'flashcard', 'quiz']).optional(),
    parentCmtId: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive())
        .optional(),
    level: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().min(0))
        .optional(),
    page: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive())
        .optional(),
    limit: z
        .string()
        .transform(val => parseInt(val))
        .pipe(z.number().int().positive().max(100))
        .optional(),
    includeReplies: z.enum(['true', 'false']).optional(),
});
