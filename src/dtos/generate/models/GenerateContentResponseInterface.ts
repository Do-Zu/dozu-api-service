/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GenerateContentResponseInterface = {
    /**
     * Unique identifier for the generation job.
     */
    jobId: string;
    /**
     * Timestamp when the job was created.
     */
    timestamp?: string;
    /**
     * Current status of the job.
     */
    status: string;
    /**
     * Optional type of the job, which can be used to categorize or identify the job.
     */
    type?: string;
    /**
     * Optional message providing additional information about the job status.
     */
    data?: object[] | object;
};
