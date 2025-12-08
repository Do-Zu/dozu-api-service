import { z } from 'zod';

export interface IInputResource {
    title: string;
    contentType: string;
    metadata: Record<string, unknown>;
}

export const inputResourceSchema = z.object({
    title: z.string(),
    contentType: z.string(),
    metadata: z.record(z.any()),
});

export const inputResourcesSchema = z.array(inputResourceSchema);

export interface IAddedAttachment {
    attachmentId: number;
    createdAt: Date | null;
    description: string | null;
    title: string;
    contentType: string | null;
    metadata: unknown;
}
