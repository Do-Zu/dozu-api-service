import { TYPE_PROMPT } from '@/utils/prompt';

export interface IBodyRequestGenContent {
    content: string;
    type: string;
    method: string;
}

export interface ContentGenerationJobDataInterface {
    /** Unique identifier for tracking the job */
    jobId: string;

    /** The content to be processed/transformed */
    content: string;

    /** Name of the worker queue that will process this job */
    queue_name: string;

    /** Name of the specific job type for processing logic selection */
    job_name: string;

    /** Type of prompt/generation to perform (e.g., 'FLASH_CARD', 'MULTIPLE_CHOICE') */
    type: TYPE_PROMPT;

    isRawText?: boolean;
}
export interface IJobPushQueue {
    type: TYPE_PROMPT;
    jobId: string;
    data: unknown;
}

export interface IDataResponseGenContent {
    jobId: string;
    timestamp?: string;
    data?: object[] | object;
}

export interface IStoreCache {
    message: string;
    errorType: string;
    errorCode: number;
    errorDetails: string;
    status: string;
}
