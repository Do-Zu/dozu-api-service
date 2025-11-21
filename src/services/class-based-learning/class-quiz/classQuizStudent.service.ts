import { classQuizStudentRepo } from '@/repositories/class-based-learning/class-quiz/classQuizStudent.repo';

class ClassQuizStudentService {
  getPlayableMeta(userId: number, classQuizId: number) {
    return classQuizStudentRepo.getPlayableMeta(userId, classQuizId);
  }
  startAttempt(userId: number, classQuizId: number) {
    return classQuizStudentRepo.startAttempt(userId, classQuizId);
  }
  saveAnswer(input: { userId: number; classQuizId: number; attemptId: number; snapshotQuestionIdx: number; userAnswerIndex: number | null; }) {
    return classQuizStudentRepo.saveAnswer(input);
  }
  submitAttempt(userId: number, ids: { classQuizId: number; attemptId: number }) {
    return classQuizStudentRepo.submitAttempt(userId, ids);
  }
  myAttempts(userId: number, classId: number) {
    return classQuizStudentRepo.myAttempts(userId, classId);
  }
  attemptDetail(userId: number, ids: { classQuizId: number; attemptId: number }) {
    return classQuizStudentRepo.attemptDetail(userId, ids);
  }
}
export const classQuizStudentService = new ClassQuizStudentService();
