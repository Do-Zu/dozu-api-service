import { Worker, Job } from 'bullmq';
import { pubSubGenerateManager as queue } from '../pub-sub/pubSub.generate';
import { BaseGenerativeService } from '../base/base.abstract';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import { redisInstance } from '@/libs/redis/pub-sub/redisPubsub.connect';
import { lambdaService } from '../lambda/lambda.service';
import { sseManager } from '@/services/sse/sse.service';
import { BadRequest, Forbidden, InternalServerError, PayloadTooLarge, ServiceUnavailable } from '@/core/error';

// Types and Interfaces
import {
    GenerateContentRequestInterface,
    GenerateContentResponseInterface,
    JobStatusResponseInterface,
} from '@/dtos/generate';
import { ContentGenerationJobDataInterface, IJobPushQueue } from './types';
import { STATUS_GEN } from '../utils/constant';
import { JOB_NAME, WORKER_NAME } from '../constants/constant';
import { HTTP_STATUS } from '@/constants/index.constant';
import { validatePayloadSizeBuffer } from '../utils/validate';
import { isNilOrEmpty, lowercase } from '@/utils/common';

/**
 * Main generative service implementation
 *
 * This service handles:
 * 1. Content generation requests via LLMs
 * 2. Job queueing and processing using BullMQ
 * 3. Output streaming via SSE
 * 4. AWS Lambda integration for scalable processing
 * 5. Result caching in Redis
 */
class GenerativeService extends BaseGenerativeService {
    private readonly TYPE_PROMPT_MAPPING: Record<string, TYPE_PROMPT> = {
        flashcard: 'FLASH_CARD',
        quiz: 'QUIZ',
        mindmap: 'MIND_MAP',
        feynman_review: 'FEYNMAN_REVIEW',
        feynman_question: 'FEYNMAN_QUESTION',
        short_summary: 'SHORT_SUMMARY',
    };

    // BullMQ Worker configuration
    private worker: Worker;
    private readonly RESULT_TTL: number = 60 * 5; // 5 minutes
    private readonly MAX_JOB_RETRIES: number = 3;
    private readonly DEFAULT_MAX_TOKEN_CONFIG = 8000;
    private readonly DEFAULT_TEMP = 0.2;
    private readonly CLIENT_WAIT_TIMEOUT = 60 * 10; // 10 minutes max wait for client connection
    private readonly PREFIX_KEY_CACHED_JOB = 'JOB_GENERATED_MESSAGE_BULL_JOB_INDEX';

    constructor() {
        super();

        // Initialize worker with concurrency of 2
        this.worker = queue.createWorker(WORKER_NAME, this.processor.bind(this), 2);

        // Set up error handling for worker
        this.setupWorkerErrorHandlers();
    }

    /**
     * Set up error handlers for BullMQ worker
     */
    private setupWorkerErrorHandlers(): void {
        this.worker.on('error', error => {
            logger.error(`Worker error: ${error.message}`, { stack: error.stack });
        });

        this.worker.on('failed', (job, error) => {
            if (job) {
                logger.error(`Job ${job.id} failed: ${error.message}`, {
                    jobId: job.data?.jobId,
                    stack: error.stack,
                });

                // Notify client of failure if they're still connected
                this.notifyClientOfFailure(job.data?.jobId, error);
            }
        });
    }

    /**
     * Notify client of job failure via SSE
     */
    private notifyClientOfFailure(jobId: string | undefined, error: Error): void {
        if (!jobId) return;

        if (sseManager.isClientConnected(jobId)) {
            const clientError = {
                message: 'An error occurred while processing your request',
                errorType: error.name || 'ProcessingError',
                errorCode: 500,
                errorDetails: error.message,
                status: STATUS_GEN.error,
            };

            sseManager.sendEvent(jobId, clientError, true);
        }
    }

    /**
     * Process job from queue
     * This is the main worker function that handles content generation jobs
     */
    private async processor(job: Job): Promise<void> {
        const { jobId, data: dataGenerated, type } = job.data;

        try {
            if (!job || !dataGenerated || !jobId) {
                throw new ServiceUnavailable('Processor received invalid data!');
            }

            const { id } = job;

            if (id) {
                await redisInstance.set(
                    `${this.PREFIX_KEY_CACHED_JOB}:${id}`,
                    {
                        type,
                        jobId,
                    },
                    this.RESULT_TTL
                );
            }

            //NOTE: Only store; do not emit SSE here (cross-instance emission handled in completion handler)
            // Send data to client via SSE if connected
            // if (sseManager.isClientConnected(jobId)) {
            //     const dataResponse = { ...dataGenerated, type };
            //     const clientNotified = sseManager.sendEvent(jobId, dataResponse);
            //     if (clientNotified) {
            //         logger.info(`Data sent to client for job ${jobId}`);
            //     }
            // } else {
            //     logger.info(`No client connected for job ${jobId}, storing result in Redis`);
            // }

            // Store result in Redis for later retrieval
            logger.info(`Storing result in Redis for job ${jobId}`);

            await this.storeData(dataGenerated, jobId, type);
        } catch (error) {
            this.handleProcessorError(error, jobId);
        }
    }

    /**
     * Handle errors in job processor
     */
    private handleProcessorError(error: unknown, jobId: string): void {
        if (error instanceof Error) {
            logger.error(`Error processing job ${jobId}: ${error.message}`, {
                stack: error.stack,
                jobId,
            });

            const clientError = {
                message: 'An error occurred while processing your request',
                errorType: error.name || 'ProcessingError',
                errorCode: 500,
                errorDetails: error.message,
                status: STATUS_GEN.error,
            };

            // Send error to client if connected
            if (sseManager.isClientConnected(jobId)) {
                sseManager.sendEvent(jobId, clientError, true);
            } else {
                // Store error in Redis for later retrieval
                this.storeData(clientError, jobId, 'error').catch(err => {
                    logger.error(`Failed to store error in Redis: ${err.message}`);
                });
            }
        }
    }

    /**
     * Store data in Redis with a TTL
     */
    private async storeData(data: unknown, jobId: string, type: string): Promise<void> {
        const key = `${type}:result:${jobId}`;
        await redisInstance.set(key, data, this.RESULT_TTL);
    }

    /**
     *
     */
    public async checkStatusDataGeneratedCache(bullJobId: string): Promise<boolean> {
        return await this.checkAndSendPendingResults(bullJobId);
    }

    private mapRequestType(input: string): TYPE_PROMPT {
        const key = lowercase(input);
        return this.TYPE_PROMPT_MAPPING[key] ?? 'FLASH_CARD';
    }

    /**
     * Register a content generation request
     * This is the main entry point for content generation
     */
    public override async registerGenerateContentByLLM(
        requestData: GenerateContentRequestInterface
    ): Promise<GenerateContentResponseInterface> {
        const { content, type, options } = requestData;

        // Generate unique ID for job tracking
        const jobId = uuidv4();

        // Map request type to prompt type
        const typeSending: TYPE_PROMPT = this.mapRequestType(type);

        // Create job data
        const dataSend: ContentGenerationJobDataInterface = {
            jobId,
            content,
            queue_name: WORKER_NAME,
            job_name: JOB_NAME,
            type: typeSending,
            options,
        };

        // Check rate limit and update remaining requests for model
        await this.updateStatusLLMRateLimit();

        const shouldUseSyncProcessing = validatePayloadSizeBuffer(dataSend);

        if (shouldUseSyncProcessing) {
            return await this.processWithLambdaSync(dataSend);
        }

        // Process with Lambda async (or fallback to queue)
        return await this.processWithLambdaAsync(dataSend);
    }

    /**
     * Generate content using LLM in background
     */
    protected override async generateContentByLLMBackGround(content: string): Promise<{
        data: unknown[];
        text: string;
        status: string;
    }> {
        // Generate prompt for flashcard creation
        const prompt = generatePromptText(content, 'FLASH_CARD');

        // Use retries for more robust generation
        const fullContent = await this.generateWithRetries(prompt, {
            temperature: this.DEFAULT_TEMP,
            maxTokens: this.DEFAULT_MAX_TOKEN_CONFIG,
        });

        // Parse output and return formatted result
        const data = convertJsonToArray(fullContent || '[]');

        return {
            data,
            text: fullContent,
            status: STATUS_GEN.completed,
        };
    }

    public async *streamGenerateContent(payload: GenerateContentRequestInterface) {
        const { content, type } = payload;

        const key = lowercase(type);

        const promptType = this.TYPE_PROMPT_MAPPING[key];

        const prompt = generatePromptText(content, promptType);

        if (isNilOrEmpty(prompt)) {
            throw new BadRequest('Prompt Invalid');
        }

        for await (const chunk of this.getLLMProvider().handleProcessStreamContent(prompt)) {
            yield { status: 'connected', data: chunk };
        }
    }

    /**
     * Get job status and results
     */
    public async getJobStatus(jobId: string, type: TYPE_PROMPT): Promise<JobStatusResponseInterface> {
        // First try to get cached result from Redis
        const cachedResult = await redisInstance.get(`${type}:result:${jobId}`);

        // If result is in cache, return it
        if (cachedResult) {
            return {
                jobId,
                status: STATUS_GEN.completed as 'completed',
                data: JSON.parse(cachedResult),
            };
        }

        // If not in cache, check job status from queue
        const job = await queue.getJob(WORKER_NAME, jobId);

        // If job doesn't exist, it's an error
        if (!job) {
            throw new BadRequest('Job not found');
        }

        // Map job state to status and return job info
        const state = await job.getState();
        const status = this.mapBullMQStateToStatus(state);

        return {
            jobId: job?.data?.jobId,
            jobIndex: job.id?.toString(),
            status: status as 'register' | 'success' | 'completed' | 'fallback' | 'fail',
            data: job.returnvalue || [],
        };
    }

    /**
     * Process content generation using AWS Lambda
     * This approach allows for scalable, serverless processing
     */
    private async processWithLambdaAsync(
        dataSend: ContentGenerationJobDataInterface
    ): Promise<GenerateContentResponseInterface> {
        const { jobId, type } = dataSend;

        // Prepare data to send to Lambda with credentials
        const dataSendOnLambda = {
            ...dataSend,
            model: this.getModel(),
            apiKey: this.getApiKey(),
            providerBaseUrl: this.getProviderBaseUrl(),
        };

        let lambdaTriggered;

        try {
            // Trigger Lambda function
            lambdaTriggered = await lambdaService.triggerContentGenerationAsync(dataSendOnLambda, type);

            // Handle Lambda errors
            if (lambdaTriggered && !lambdaTriggered.success) {
                return this.handleLambdaError(lambdaTriggered);
            }

            if (!lambdaTriggered) {
                throw new ServiceUnavailable();
            }

            // If Lambda call succeeded, return success response
            if (!lambdaTriggered.success) {
                if (lambdaTriggered?.error instanceof Error) {
                    throw lambdaTriggered.error;
                } else if (typeof lambdaTriggered?.error === 'string') {
                    throw new Forbidden(lambdaTriggered.error);
                } else {
                    throw new InternalServerError('Unknown error occurred during Lambda processing');
                }
            }

            return {
                jobId: jobId,
                timestamp: new Date().toISOString(),
                status: STATUS_GEN.register,
            };
        } catch (error) {
            // Handle unexpected errors
            logger.error(`Exception triggering Lambda: ${error instanceof Error ? error.message : String(error)}`);
            return this.handleLambdaError({
                success: false,
                statusCode: lambdaTriggered ? lambdaTriggered.statusCode : 500,
                error: lambdaTriggered ? lambdaTriggered.error : error instanceof Error ? error.message : String(error),
            });
        }
    }

    private async processWithLambdaSync(
        dataSend: ContentGenerationJobDataInterface
    ): Promise<GenerateContentResponseInterface> {
        const { type } = dataSend;

        const dataSendOnLambda = {
            ...dataSend,
            model: this.getModel(),
            apiKey: this.getApiKey(),
            providerBaseUrl: this.getProviderBaseUrl(),
        };

        try {
            const result = await lambdaService.triggerContentGenerationSync(dataSendOnLambda, type);

            if (!result) {
                throw new ServiceUnavailable();
            }

            const { data, jobId } = result;

            //TODO: Check for SSE client connection first or push to queue

            // Check if SSE client is connected before deciding how to handle the result
            // await this.storeDataWithMetadata(data, jobId, type, {
            //     source: 'lambda_sync',
            //     waitingForClient: true,
            // });

            // return {
            //     jobId: jobId,
            //     timestamp: new Date().toISOString(),
            //     status: STATUS_GEN.completed,
            // };

            const dataPushToQueue: IJobPushQueue = { type, jobId, data };

            return await this.processWithQueue(WORKER_NAME, dataPushToQueue);
        } catch (error) {
            logger.error(`Exception triggering Lambda: ${error instanceof Error ? error.message : String(error)}`);
            return this.handleLambdaError({
                success: false,
                statusCode: 500,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Handle specific Lambda error cases
     */
    private handleLambdaError(lambdaResult: {
        success: boolean;
        statusCode?: number;
        error?: string | unknown;
    }): never {
        // Service unavailable (overloaded)
        if (lambdaResult.statusCode === HTTP_STATUS.SERVICE_UNAVAILABLE) {
            throw new ServiceUnavailable('Server is currently overloaded. Please try again later.');
        }

        // Payload too large
        if (
            lambdaResult.statusCode === 413 ||
            (lambdaResult.error &&
                typeof lambdaResult.error === 'string' &&
                lambdaResult.error.includes('payload is too large'))
        ) {
            throw new PayloadTooLarge(
                `Content too large for processing. Please reduce your content or upgrade your plan.`
            );
        }

        logger.error(`Lambda processing error: ${lambdaResult.error || 'Unknown error'}`);

        throw new InternalServerError();
    }

    /**
     * Process content generation using local BullMQ queue
     * This is used as a fallback when Lambda processing fails
     */
    private async processWithQueue(queueName: string, data: IJobPushQueue): Promise<GenerateContentResponseInterface> {
        const { jobId } = data;
        const jobName = `${JOB_NAME}:${jobId}`;

        try {
            // Add job to queue with configuration
            const job = await queue.addJob(queueName, jobName, data, {
                removeOnComplete: true,
                removeOnFail: this.MAX_JOB_RETRIES,
                attempts: this.MAX_JOB_RETRIES,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // Start with 5 second delay, then exponential backoff
                },
            });

            if (!job) {
                throw new InternalServerError('Failed to queue job');
            }

            return {
                jobId: jobId,
                timestamp: new Date().toISOString(),
                status: STATUS_GEN.register,
            };
        } catch (error) {
            logger.error(`Error adding job to queue: ${error instanceof Error ? error.message : String(error)}`);
            throw new InternalServerError('Server Busy');
        }
    }

    /**
     * Map BullMQ job state to custom status
     */
    private mapBullMQStateToStatus(state: string): string {
        switch (state) {
            case 'waiting':
            case 'delayed':
                return STATUS_GEN.register;
            case 'active':
                return STATUS_GEN.success;
            case 'completed':
                return STATUS_GEN.completed;
            case 'error':
                return STATUS_GEN.error;
            default:
                return STATUS_GEN.register;
        }
    }

    private async checkStatusOfMessage(bullJobId: string) {
        const bullJob = await queue.getJob(WORKER_NAME, bullJobId);

        if (bullJob && bullJob?.data)
            return {
                jobId: bullJob?.data?.jobId,
                type: bullJob?.data?.type,
            };

        return await redisInstance.get(`${this.PREFIX_KEY_CACHED_JOB}:${bullJobId}`);
    }

    /**
     * Check and send pending results when a client connects
     * This method is called when SSE client connects to check if there are already processed results
     */
    private async checkAndSendPendingResults(bullJobId: string): Promise<boolean> {
        try {
            const messageInfo = await this.checkStatusOfMessage(bullJobId);

            if (!messageInfo?.jobId || !messageInfo.type) return false;

            const { jobId, type } = messageInfo;

            if (!sseManager.isClientConnected(jobId)) {
                // No local client; nothing to do (another instance may own it)
                return false;
            }

            let cached;

            const resultTypes = type ? [type] : ['FLASH_CARD', 'MULTIPLE_CHOICE', 'MIND_MAP'];

            for (const typeMethod of resultTypes) {
                const resultKey = `${typeMethod}:result:${jobId}`;

                // Retry 5 times for result presence
                for (let i = 0; i < 5; i++) {
                    cached = await redisInstance.get(resultKey);
                    if (cached) break;
                }
            }

            if (!cached) {
                logger.warn(`Cached result not found yet for job ${jobId} (type ${type}) on completion`);
                return false;
            }

            sseManager.sendEvent(jobId, { ...cached, type });

            logger.info(`SSE result delivered for job ${jobId}`);

            return true;
        } catch (err) {
            logger.error(`Error in completion handler dispatch for job ${bullJobId}: ${(err as Error).message}`);
            return false;
        }
    }
}

export const generativeService = new GenerativeService();
