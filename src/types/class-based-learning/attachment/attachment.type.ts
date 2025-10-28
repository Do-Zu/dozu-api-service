import { TypeSelectAttachment } from '@/models';

export type ReturnAttachment = TypeSelectAttachment & { presignedUrl?: string };
