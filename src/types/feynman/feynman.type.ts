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

export interface ICompareSimilarityRequest {
    topicId: number;
    methodLearning?: string;
    type: string;
    pattern: string;
    query: string;
    question: string;
    metaData?: Record<string, unknown>;
}
