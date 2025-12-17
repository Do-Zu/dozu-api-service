import { z } from 'zod';

export const feedbackStatusEnum = z.enum(['new', 'reviewed', 'ignored', 'resolved']);
export type FeedbackStatus = z.infer<typeof feedbackStatusEnum>;

export const feedbackCategoryEnum = z.enum(['bug', 'feature', 'praise', 'other']);
export type FeedbackCategory = z.infer<typeof feedbackCategoryEnum>;

export const getAdminFeedbackQuerySchema = z.object({
  // pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50).optional(),

  // filters
  minScore: z.coerce.number().int().min(0).optional(),
  maxScore: z.coerce.number().int().min(0).optional(),
  hasImage: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      if (v === true || v === false) return v;
      const s = String(v).toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
      return v;
    }, z.boolean().optional())
    .optional(),

  status: feedbackStatusEnum.optional(),
  category: feedbackCategoryEnum.optional(),
  search: z.string().trim().min(1).optional(),

  // default dashboard behavior
  // if omitted: importantOnly=true
  importantOnly: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const s = String(v).toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
      return v;
    }, z.boolean().optional())
    .optional(),
});

export type GetAdminFeedbackQueryDto = z.infer<typeof getAdminFeedbackQuerySchema>;

export const updateFeedbackSchema = z
  .object({
    status: feedbackStatusEnum.optional(),
    category: feedbackCategoryEnum.optional().nullable(),
  })
  .refine((v) => v.status !== undefined || v.category !== undefined, {
    message: 'At least one field (status/category) must be provided',
  });

export type UpdateFeedbackDto = z.infer<typeof updateFeedbackSchema>;
