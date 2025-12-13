import { z } from 'zod';

// Shared deadline validation function
const validateDeadlineNotInPast = (d: Date | null | undefined): boolean => {
    if (d === null || d === undefined) return true;
    if (isNaN(d.getTime())) return false;
    // Check if deadline is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(d);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate >= today;
};

// Shared deadline schema
const deadlineSchema = z
    .union([z.null(), z.coerce.date()])
    .optional()
    .refine(validateDeadlineNotInPast, { message: 'Deadline cannot be in the past' });

// Shared assignment status schema
const assignmentStatusSchema = z
    .union([z.literal('draft'), z.literal('scheduled'), z.literal('published'), z.literal('closed'), z.undefined()])
    .optional();

// Shared common assignment fields schema
const commonAssignmentFieldsSchema = z.object({
    topicId: z.union([z.number(), z.undefined()]).optional().nullable(),
    title: z.string().min(1, { message: 'Title must be at least 1 character' }),
    content: z.union([z.string(), z.undefined()]).optional(),
    deadline: deadlineSchema,
    totalGrades: z.union([z.number(), z.undefined()]).optional(),
    status: assignmentStatusSchema,
    acceptingSubmissions: z.boolean(),
    publishedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
    urls: z.array(z.string()).nullable().optional(),
});

export const insertAssignmentSchema = commonAssignmentFieldsSchema.extend({
    classId: z.number(),
    teacherId: z.number(),
});

export const updateAssignmentSchema = commonAssignmentFieldsSchema.extend({
    updatedAt: z.union([z.date(), z.undefined()]).optional().nullable(),
});
