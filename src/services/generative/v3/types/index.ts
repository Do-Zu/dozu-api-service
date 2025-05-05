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
}
