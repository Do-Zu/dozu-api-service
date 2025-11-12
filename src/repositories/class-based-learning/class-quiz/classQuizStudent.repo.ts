// src/features/class-quiz/repositories/student/classQuizStudent.repo.ts
import { classQuizSharedRepo } from './classQuiz.shared.repo';

export const classQuizStudentRepo = {
  getPlayableMeta: classQuizSharedRepo.getPlayableMeta,

  startAttempt: classQuizSharedRepo.startAttempt,

  async saveAnswer(input: {
    userId: number;
    classQuizId: number;
    attemptId: number;
    snapshotQuestionIdx: number;
    userAnswerIndex: number | null;
  }) {
    // policy: ensure attempt is editable and belongs to user
    await classQuizSharedRepo.assertAttemptEditable(
      input.attemptId,
      input.userId,
      input.classQuizId
    );
    const saved = await classQuizSharedRepo.upsertAnswer(
      input.attemptId,
      input.snapshotQuestionIdx,
      input.userAnswerIndex
    );
    return { saved };
  },

  submitAttempt: classQuizSharedRepo.finalizeAttempt,

  myAttempts: classQuizSharedRepo.myAttempts,

  attemptDetail: classQuizSharedRepo.attemptDetail,
};
