import { z } from 'zod';

export const backlogSource = ['first_half', 'second_half', 'manual', 'backlog_quiz'] as const;
export const backlogStatus = ['active', 'reserved', 'consumed'] as const;

export const backlogCountQuerySchema = z.object({
    topicId: z.coerce.number(),
});

export const backlogAddSchema = z.object({
    topicId: z.coerce.number(),
    items: z
        .array(
            z.object({
                flashcardId: z.coerce.number(),
                source: z.enum(backlogSource),
                sessionEpoch: z.coerce.number().optional(),
                orderIndex: z.coerce.number().optional(),
            })
        )
        .min(1),
});

export const backlogReserveSchema = z.object({
    topicId: z.coerce.number(),
    limit: z.coerce.number().int().positive().max(200).default(80),
    clientRequestId: z.string().min(8).max(64),
});

export const backlogCommitSchema = z.object({
    topicId: z.coerce.number(),
    itemIds: z.array(z.coerce.number()).min(1),
});

export const backlogReleaseSchema = backlogCommitSchema;

export const backlogClearQuerySchema = z.object({
    topicId: z.coerce.number(),
    force: z.coerce.boolean().optional(),
});

export type BacklogReserveItem = {
    id: number;
    flashcardId: number;
    source: 'first_half' | 'second_half' | 'manual' | 'backlog_quiz';
    orderIndex: number | null;

    // payload for quiz
    front: string;
    back: string;
    imageUrl: string | null;
    topicName: string | null;
};

export type BacklogCountQueryDto = z.infer<typeof backlogCountQuerySchema>;
export type BacklogAddDto = z.infer<typeof backlogAddSchema>;
export type BacklogReserveDto = z.infer<typeof backlogReserveSchema>;
export type BacklogCommitDto = z.infer<typeof backlogCommitSchema>;
export type BacklogReleaseDto = z.infer<typeof backlogReleaseSchema>;
export type BacklogClearQueryDto = z.infer<typeof backlogClearQuerySchema>;
