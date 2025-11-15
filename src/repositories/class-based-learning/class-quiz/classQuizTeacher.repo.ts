// src/features/class-quiz/repositories/teacher/classQuizTeacher.repo.ts
import { classQuizSharedRepo } from './classQuiz.shared.repo';

export const classQuizTeacherRepo = {
  // wrap shared to keep a clean seam for policies/permissions later
  createDraftQuiz: classQuizSharedRepo.createClassQuiz,

  upsertDraft: classQuizSharedRepo.upsertDraft,

  updateSettings: classQuizSharedRepo.updateSettings,

  async schedule(classQuizId: number, dto: { startAt: string; endAt: string }) {
    await classQuizSharedRepo.applySchedule(classQuizId, dto);
    await classQuizSharedRepo.setStatus(classQuizId, 'scheduled');
    return { status: 'scheduled' as const };
  },

  publish: classQuizSharedRepo.publish,

  setAcceptingSubmissions: classQuizSharedRepo.setAcceptingSubmissions,

  close: classQuizSharedRepo.close,

  listClassQuizzes: classQuizSharedRepo.listClassQuizzes,
  getDraft: classQuizSharedRepo.getDraft,
  getClassQuizInfo: classQuizSharedRepo.getClassQuizInfo,
};
