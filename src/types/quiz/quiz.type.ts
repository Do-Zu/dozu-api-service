export type ConfidenceLevel = 1 | 2 | 3;
export interface IQuizResultPayload {
  questionId: number;
  correct: boolean;
  userAnswerIndex: number | null;
  confidence?: ConfidenceLevel;
}
