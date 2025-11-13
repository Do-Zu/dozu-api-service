import { z } from 'zod';

// ===== Shared =====
export const classQuizStatus = z.enum(['draft','scheduled','published','closed']);
export const attemptStatus = z.enum(['in_progress','submitted','cancelled']);

export const idSchema = z.coerce.number().int().positive();

// ===== Teacher DTOs =====
export const createClassQuizSchema = z.object({
  teacherId: idSchema,
  topicId: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().min(1),
  content: z.string().default(''),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  durationSeconds: z.coerce.number().int().positive().nullable().optional(),
  maxAttempts: z.coerce.number().int().positive().default(1),
  shuffleQuestions: z.boolean().default(true),
  shuffleChoices: z.boolean().default(true),
  showScoreToStudent: z.boolean().default(true),
});

export const upsertDraftSchema = z.object({
  teacherId: idSchema,
  draftJson: z.object({
    orderSeed: z.string().optional(),
    items: z.array(
      z.union([
        z.object({
          adHoc: z.literal(true).default(true),
          text: z.string(),
          choices: z.array(z.string()).min(2),
          correctIndex: z.coerce.number().int().nonnegative(),
        }),
        z.object({
          originQuestionId: z.coerce.number().int().positive(),
        }),
      ])
    ).min(1),
    meta: z.record(z.any()).optional(),
  }),
});

export const updateQuizSettingsSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  durationSeconds: z.coerce.number().int().positive().nullable().optional(),
  maxAttempts: z.coerce.number().int().positive().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleChoices: z.boolean().optional(),
  showScoreToStudent: z.boolean().optional(),
  acceptingSubmissions: z.boolean().optional(),
});

export const scheduleSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const listClassQuizzesQuerySchema = z.object({
  status: classQuizStatus.optional(),
});

// ===== Student DTOs =====
export const getPlayableMetaQuery = z.object({
  // no params, rely on path
});

export const startAttemptBody = z.object({
  userId: idSchema,
});

export const saveAnswerBody = z.object({
  userId: idSchema,
  snapshotQuestionIdx: z.coerce.number().int().positive(),
  userAnswerIndex: z.coerce.number().int().nonnegative().nullable(),
});

export const submitAttemptBody = z.object({
  userId: idSchema,
});

export const meAttemptsQuery = z.object({
  status: attemptStatus.optional(),
});

export type CreateClassQuizDto = z.infer<typeof createClassQuizSchema>;
export type UpsertDraftDto = z.infer<typeof upsertDraftSchema>;
export type UpdateQuizSettingsDto = z.infer<typeof updateQuizSettingsSchema>;
export type ScheduleDto = z.infer<typeof scheduleSchema>;
export type SaveAnswerDto = z.infer<typeof saveAnswerBody>;
