import { Worker, Job } from 'bullmq';
import { bullMQService as queue } from '@/libs/bullmq/bullmq';
import { BaseGenerativeService } from './base/base.abstract';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import { redisInstance } from '@/libs/redis/pub-sub/redisPubsub.connect';
import { lambdaService } from './lambda/lambda.service';
import { sseManager } from '@/services/sse/sse.service';
import { BadRequest, InternalServerError, PayloadTooLarge, ServiceUnavailable } from '@/core/error';

// Types and Interfaces
import {
  GenerateContentRequestInterface,
  GenerateContentResponseInterface,
  JobStatusResponseInterface,
} from '@/dtos/generate';
import { ContentGenerationJobDataInterface } from './types';
import { STATUS_GEN } from './utils/constant';

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
  // BullMQ Worker configuration
  private worker: Worker;
  private readonly WORKER_NAME: string = 'WORKER_OPEN_API_INTEGRATE_GEN_CONTENT';
  private readonly JOB_NAME: string = 'GENERATE_FLASHCARD';
  private readonly RESULT_TTL: number = 60 * 5; // 5 minutes (300 seconds)
  private readonly MAX_JOB_RETRIES: number = 3;
  private readonly DEFAULT_MAX_TOKEN_CONFIG = 8000;
  private readonly DEFAULT_TEMP = 0.2;

  constructor() {
    super();

    // Initialize worker with concurrency of 2
    this.worker = queue.createWorker(this.WORKER_NAME, this.processor.bind(this), 2);

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
        status: STATUS_GEN.fail,
      };

      sseManager.sendEvent(jobId, clientError, true);
    }
  }

  /**
   * Process job from queue
   * This is the main worker function that handles content generation jobs
   */
  private async processor(job: Job): Promise<void> {
    const { jobId, data } = job.data;

    try {
      logger.info(`Processing job ${jobId}`);

      // Send data to client via SSE if connected
      if (sseManager.isClientConnected(jobId)) {
        const clientNotified = sseManager.sendEvent(jobId, data);
        if (clientNotified) {
          logger.info(`Data sent to client for job ${jobId}`);
        }
      } else {
        logger.info(`No client connected for job ${jobId}, storing result in Redis`);
      }

      // Store result in Redis for later retrieval
      await this.storeData(data, jobId);
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
        status: STATUS_GEN.fail,
      };

      // Send error to client if connected
      if (sseManager.isClientConnected(jobId)) {
        sseManager.sendEvent(jobId, clientError, true);
      } else {
        // Store error in Redis for later retrieval
        this.storeData(clientError, jobId).catch(err => {
          logger.error(`Failed to store error in Redis: ${err.message}`);
        });
      }
    }
  }

  /**
   * Store data in Redis with a TTL
   */
  private async storeData(data: unknown, jobId: string): Promise<void> {
    const key = `flashcard:result:${jobId}`;
    await redisInstance.set(key, data, this.RESULT_TTL);
  }

  /**
   * Register a content generation request
   * This is the main entry point for content generation
   */
  public override async registerGenerateContentByLLM(
    requestData: GenerateContentRequestInterface
  ): Promise<GenerateContentResponseInterface> {
    const { content, type } = requestData;

    // Generate unique ID for job tracking
    const jobId = uuidv4();

    // Map request type to prompt type
    let typeSending: TYPE_PROMPT = 'FLASH_CARD';
    switch (type) {
      case 'flashcard':
        typeSending = 'FLASH_CARD';
        break;
      case 'quiz':
        typeSending = 'MULTIPLE_CHOICE';
        break;
      default:
        typeSending = 'FLASH_CARD';
    }

    // Create job data
    const dataSend: ContentGenerationJobDataInterface = {
      jobId,
      content,
      queue_name: this.WORKER_NAME,
      job_name: this.JOB_NAME,
      type: typeSending,
    };

    // Check rate limit and update remaining requests for model
    await this.updateStatusLLMRateLimit();

    // Process with Lambda (or fallback to queue)
    return await this.processWithLambda(dataSend);
  }

  /**
   * Generate content using LLM in background
   */
  protected override async generateContentByLLMBackGround(content: string): Promise<any> {
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

  /**
   * Get job status and results
   */
  public async getJobStatus(jobId: string): Promise<JobStatusResponseInterface> {
    // First try to get cached result from Redis
    const cachedResult = await redisInstance.get(`flashcard:result:${jobId}`);

    // If result is in cache, return it
    if (cachedResult) {
      return {
        jobId,
        status: STATUS_GEN.completed as 'completed',
        data: JSON.parse(cachedResult),
      };
    }

    // If not in cache, check job status from queue
    const job = await queue.getJob(this.WORKER_NAME, jobId);

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
  private async processWithLambda(
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

    try {
      // Trigger Lambda function
      const lambdaTriggered = await lambdaService.triggerContentGeneration(dataSendOnLambda, type);

      // Handle Lambda errors
      if (lambdaTriggered && !lambdaTriggered.success) {
        return this.handleLambdaError(lambdaTriggered);
      }

      // If Lambda call succeeded, return success response
      if (lambdaTriggered && lambdaTriggered.success) {
        return {
          jobId: jobId,
          timestamp: new Date().toISOString(),
          status: STATUS_GEN.register,
        };
      }

      // If Lambda failed without specific error, use fallback
      logger.warn(`Failed to trigger Lambda for job ${jobId}, will use fallback processing`);
      return await this.processWithQueue(dataSend);
    } catch (error) {
      // Handle unexpected errors
      logger.error(
        `Exception triggering Lambda: ${error instanceof Error ? error.message : String(error)}`
      );
      return await this.processWithQueue(dataSend);
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
    if (lambdaResult.statusCode === 503) {
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

    // Generic error
    throw new InternalServerError(
      `Failed to process request: ${lambdaResult.error || 'Unknown error'}`
    );
  }

  /**
   * Process content generation using local BullMQ queue
   * This is used as a fallback when Lambda processing fails
   */
  private async processWithQueue(
    dataSend: ContentGenerationJobDataInterface
  ): Promise<GenerateContentResponseInterface> {
    const { jobId } = dataSend;
    const jobName = `${this.JOB_NAME}:${jobId}`;

    try {
      // Add job to queue with configuration
      const job = await queue.addJob(this.WORKER_NAME, jobName, dataSend, {
        removeOnComplete: true, // Remove job when complete to save space
        removeOnFail: this.MAX_JOB_RETRIES, // Keep failed jobs for debugging, but not indefinitely
        attempts: this.MAX_JOB_RETRIES, // Retry a few times before giving up
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
      logger.error(
        `Error adding job to queue: ${error instanceof Error ? error.message : String(error)}`
      );
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
      case 'failed':
        return STATUS_GEN.fail;
      default:
        return STATUS_GEN.register;
    }
  }
}

export const generativeService = new GenerativeService();
