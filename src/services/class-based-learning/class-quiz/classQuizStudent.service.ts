import { classQuizStudentRepo } from '@/repositories/class-based-learning/class-quiz/classQuizStudent.repo';
import { quizActivityWebSocketService } from '@/libs/websocket/quizActivity.websocket';

class ClassQuizStudentService {
  getPlayableMeta(userId: number, classQuizId: number) {
    return classQuizStudentRepo.getPlayableMeta(userId, classQuizId);
  }

  async startAttempt(userId: number, classQuizId: number) {
    const result = await classQuizStudentRepo.startAttempt(userId, classQuizId);
    
    // Emit realtime event for quiz activity
    if (result?.attemptId) {
      quizActivityWebSocketService.emitActivityUpdate(
        classQuizId,
        'quiz-attempt-started',
        {
          classQuizId,
          userId,
          attemptId: result.attemptId,
        }
      );
    }
    
    return result;
  }

  async saveAnswer(input: { userId: number; classQuizId: number; attemptId: number; snapshotQuestionIdx: number; userAnswerIndex: number | null; }) {
    const result = await classQuizStudentRepo.saveAnswer(input);
    
    // Emit realtime event for quiz activity with correct status
    quizActivityWebSocketService.emitActivityUpdate(
      input.classQuizId,
      'quiz-answer-saved',
      {
        classQuizId: input.classQuizId,
        userId: input.userId,
        attemptId: input.attemptId,
        questionIndex: input.snapshotQuestionIdx,
        answerIndex: input.userAnswerIndex,
        isCorrect: result?.saved?.correct ?? null,
      }
    );
    
    return result;
  }

  async submitAttempt(userId: number, ids: { classQuizId: number; attemptId: number }) {
    const result = await classQuizStudentRepo.submitAttempt(userId, ids);
    
    // Emit realtime event for quiz activity
    quizActivityWebSocketService.emitActivityUpdate(
      ids.classQuizId,
      'quiz-attempt-submitted',
      {
        classQuizId: ids.classQuizId,
        userId,
        attemptId: ids.attemptId,
        score: result?.score,
      }
    );
    
    return result;
  }

  myAttempts(userId: number, classId: number) {
    return classQuizStudentRepo.myAttempts(userId, classId);
  }

  attemptDetail(userId: number, ids: { classQuizId: number; attemptId: number }) {
    return classQuizStudentRepo.attemptDetail(userId, ids);
  }
}
export const classQuizStudentService = new ClassQuizStudentService();
