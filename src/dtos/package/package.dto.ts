import { z } from 'zod';

// Base ID schema: integer > 0, coercing from string when needed
export const idSchema = z.coerce.number().int().positive();

export const createPackageSchema = z.object({
    title: z.string().trim().min(1, 'Title is required'),
    // parentId is optional and may be null; when provided (not null), must be integer > 0
    parentId: z
        .union([z.null(), z.coerce.number().int().positive()])
        .optional()
        .transform(v => (v === undefined ? undefined : v)),
});

export const updatePackageSchema = z.object({
    packageId: idSchema,
    title: z.string().trim().min(1, 'Title is required'),
});

export const packageIdBodySchema = z.object({
    packageId: idSchema,
});

export const getPackageTopicsSchema = packageIdBodySchema;

export const updateTopicInPackageSchema = z.object({
    topicId: idSchema,
    packageId: idSchema,
});

export const removeTopicInPackageSchema = z.object({
    topicId: idSchema,
    packageId: idSchema,
});

// Query schemas
export const getPackagesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
});

export const getUnAssignedTopicQueryScheme = z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    packageId: idSchema,
    parentId: z
        .union([z.null(), z.coerce.number().int().positive()])
        .optional()
        .transform(v => (v === undefined ? undefined : v)),
});

export type CreatePackageDTO = z.infer<typeof createPackageSchema>;
export type UpdatePackageDTO = z.infer<typeof updatePackageSchema>;
export type PackageIdBodyDTO = z.infer<typeof packageIdBodySchema>;
export type GetPackagesQueryDTO = z.infer<typeof getPackagesQuerySchema>;
export type GetTopicUnAssignedPackageDTO = z.infer<typeof getUnAssignedTopicQueryScheme>;
