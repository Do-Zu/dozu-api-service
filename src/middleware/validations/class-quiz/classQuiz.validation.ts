import validator from '@/core/validations/validator';
import {
  createClassQuizSchema,
  upsertDraftSchema,
  updateQuizSettingsSchema,
  scheduleSchema,
  saveAnswerBody,
  submitAttemptBody,
  listClassQuizzesQuerySchema,
} from '@/dtos/class-quiz/classQuiz.dto';

export const validateCreateClassQuiz = () =>
  validator.validate({ selector: 'body', schema: createClassQuizSchema });

export const validateUpsertDraft = () =>
  validator.validate({ selector: 'body', schema: upsertDraftSchema });

export const validateUpdateSettings = () =>
  validator.validate({ selector: 'body', schema: updateQuizSettingsSchema });

export const validateSchedule = () =>
  validator.validate({ selector: 'body', schema: scheduleSchema });

export const validateSaveAnswer = () =>
  validator.validate({ selector: 'body', schema: saveAnswerBody });

export const validateSubmitAttempt = () =>
  validator.validate({ selector: 'body', schema: submitAttemptBody });

export const validateListClassQuizzes = () =>
  validator.validate({ selector: 'query', schema: listClassQuizzesQuerySchema });
