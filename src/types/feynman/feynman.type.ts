import { IFeynmanSessionQuestions, IFeynmanSessionReviewState } from '@/models/feynman';

export interface FeynmanSessionSavePayload {
    topicId: number;
    method: string;
    explanationText: string;
    explanationHtml: string;
    highlightedWords: string[];
    questions: IFeynmanSessionQuestions;
    review?: IFeynmanSessionReviewState;
    step: number;
    version?: number;
    savedAt: string;
}

export type FeynmanSessionUpdate = Pick<FeynmanSessionSavePayload, 'topicId' | 'method'> &
    Partial<Omit<FeynmanSessionSavePayload, 'topicId' | 'method'>>;

export interface IUpdateReview {
    review: IFeynmanSessionReviewState;
    topicId: number;
    method: string;
}

export interface IGetSession {
    topicId: number;
    method: string;
    limit?: number;
}
