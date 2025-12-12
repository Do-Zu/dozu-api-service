import { z } from 'zod';

export const insertAssignmentSubmissionSchema = z.object({
    assignmentId: z.number(),
    studentId: z.number(),
    status: z.union([z.literal('draft'), z.literal('submitted'), z.literal('returned'), z.undefined()]).optional(),
    grade: z.union([z.number(), z.undefined()]).optional().nullable(),
    urls: z.array(z.string()).nullable().optional(),
});

export const updateAssignmentSubmissionSchema = z.object({
    updatedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
    status: z.union([z.literal('draft'), z.literal('submitted'), z.literal('returned'), z.undefined()]).optional(),
    grade: z.union([z.number(), z.undefined()]).optional().nullable(),
    submittedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
    returnedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
    urls: z.array(z.string()).nullable().optional(),
});

export const gradeAssignmentSubmissionSchema = z.object({
    grade: z.number(),
});
