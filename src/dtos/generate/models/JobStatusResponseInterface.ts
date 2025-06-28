/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FlashcardItemInterface } from './FlashcardItemInterface';
import type { QuizItemInterface } from './QuizItemInterface';
export type JobStatusResponseInterface = ({
    /**
     * Unique identifier for the generation job.
     */
    jobId: string;
    /**
     * Optional index of the job in the processing queue.
     */
    jobIndex?: string;
    /**
     * Current status of the generation job.
     */
    status: string;
    /**
     * Generated flashcards or quiz items.
     */
    data: Array<(FlashcardItemInterface | QuizItemInterface)>;
} | {
    /**
     * Status indicating the job was not found.
     */
    status: string;
    /**
     * Detailed error message.
     */
    message: string;
});

