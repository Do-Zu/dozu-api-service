export interface IQuizResultPayload {
  questionId: number;
  correct: boolean;
  userAnswerIndex: number | null;
}
