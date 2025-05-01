import { Worker, Job, tryCatch } from 'bullmq';
import { bullMQService as queue } from '@/libs/bullmq/bullmq';
import { BaseGenerativeService } from './base/base.abstract';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import { redisInstance } from '@/libs/redis/redis.connect';
import { lambdaService } from './provider/lambda.service';
import { sseManager } from '@/services/sse/sse.service';
import { ContentGenerationJobDataInterface, IBodyRequestGenContent } from './types';
import { STATUS_GEN } from './utils/constant';
import {
  GenerateContentRequestInterface,
  GenerateContentResponseInterface,
  JobStatusResponseInterface,
} from '@/dtos/generate';
import { BadRequest, InternalServerError, PayloadTooLarge, ServiceUnavailable } from '@/core/error';
import { decompressContent } from '@/utils/compress';

class GenerativeService extends BaseGenerativeService {
  private worker: Worker;

  private readonly WORKER_NAME: string = 'WORKER_HANDLER_OPEN_API_INTEGRATE_GEN_CONTENT';
  private readonly JOB_NAME: string = 'GENERATE_FLASHCARD';
  private readonly RESULT_TTL: number = 60 * 5; // 5 minutes

  constructor() {
    super();
    this.worker = queue.createWorker(this.WORKER_NAME, this.processor.bind(this), 3);
  }

  private async processor(job: Job) {
    const { jobId, content } = job.data;
    try {
      const decompressedContent = decompressContent(content);

      const data = await this.generateContentByLLMBackGround(decompressedContent);

      if (sseManager.isClientConnected(jobId)) {
        //immediately send the data via SSE
        const clientNotified = sseManager.sendEvent(jobId, data);
        if (clientNotified) {
          logger.info(`Data sent to client for job ${jobId}`);
        }
      } else {
        logger.info(`No client connected for job ${jobId}, storing result in Redis`);
      }

      await this.storeData(data, jobId);
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error here!');
        logger.error(`Error processing job ${jobId}: ${error?.message}`, {
          stack: error?.stack,
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
          const clientNotified = sseManager.sendEvent(jobId, clientError, true);
          if (clientNotified) {
            logger.info(`Error sent to client for job ${jobId}`);
          }
        } else {
          logger.info(`No client connected for job ${jobId}, error stored in Redis`);
        }
      }
    }
  }

  private async storeData(data: any, jobId: string) {
    const key = `flashcard:result:${jobId}`;
    await redisInstance.set(key, data, this.RESULT_TTL);
  }

  /**
   * @description Create job and push into queue
   * @param requestData The content generation request
   * @returns Object with jobId for tracking
   */
  public async registerGenerateContentByLLM(
    requestData: GenerateContentRequestInterface
  ): Promise<GenerateContentResponseInterface> {
    const { content, type } = requestData;
    const jobId = uuidv4();

    let typeSending: TYPE_PROMPT = 'FLASH_CARD';

    switch (type) {
      case 'flashcard':
        typeSending = 'FLASH_CARD';
        break;
      case 'quiz':
        typeSending = 'MULTIPLE_CHOICE';
        break;
    }

    const dataSend: ContentGenerationJobDataInterface = {
      jobId,
      content,
      queue_name: this.WORKER_NAME,
      job_name: this.JOB_NAME,
      type: typeSending,
    };

    // BUG: LAMBDA FUNCTION PROCESS
    //return await this.processWithLambda(dataSend);
    //TEMP
    return await this.processWithQueue(dataSend);
  }

  /**
   * @description Generates flashcards using the OpenAI API streaming method
   * @param content The content to generate flashcards from
   * @returns list flashcards
   */
  private async generateContentByLLMBackGround(content: string): Promise<any> {
    const prompt = generatePromptText(content, 'FLASH_CARD');

    let fullContent = '';

    for await (const chunk of this.streamContentFromGoogleStudio(prompt)) {
      fullContent += chunk;
    }

    const data = convertJsonToArray(fullContent || '[]');

    return {
      data,
      text: fullContent,
      status: STATUS_GEN.completed,
    };
  }

  /**
   * Get job status
   * @param jobId The job ID to check
   * @returns The job status information
   */
  public async getJobStatus(jobId: string): Promise<JobStatusResponseInterface> {
    // First try to get cached result from Redis
    const cachedResult = await redisInstance.get(`flashcard:result:${jobId}`);

    if (cachedResult) {
      const successResponse: JobStatusResponseInterface = {
        jobId,
        status: STATUS_GEN.completed as 'completed',
        data: JSON.parse(cachedResult),
      };
      return successResponse;
    }

    // If not in cache, check job status from queue
    const job = await queue.getJob(this.WORKER_NAME, jobId);

    if (!job) {
      throw new BadRequest('Job not found');
    }

    const state = await job.getState();
    const status = this.mapBullMQStateToStatus(state);

    const successResponse: JobStatusResponseInterface = {
      jobId: job?.data?.jobId,
      jobIndex: job.id?.toString(),
      status: status as 'register' | 'success' | 'completed' | 'fallback' | 'fail',
      data: job.returnvalue || [],
    };

    return successResponse;
  }

  /**
   * Maps BullMQ job states to our status constants
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

  /**
   * Lambda-based content generation processing
   *
   * This approach sends content to AWS Lambda for processing, which is good for:
   * - Scalable, serverless processing of content generation requests
   * - Handling load spikes without maintaining persistent resources
   * - Isolating resource-intensive tasks from main application
   *
   * @param dataSend Object containing job data (content, jobId, etc.)
   * @param type Type of content to generate (flashcard, quiz, etc.)
   * @returns Response with job tracking information
   */
  private async processWithLambda(
    dataSend: ContentGenerationJobDataInterface
  ): Promise<GenerateContentResponseInterface> {
    const { jobId, content, type } = dataSend;

    // Trigger Lambda function to process the content
    const lambdaTriggered = await lambdaService.triggerContentGeneration(dataSend, type);

    // Handle Lambda errors
    if (lambdaTriggered && !lambdaTriggered.success) {
      if (lambdaTriggered.statusCode === 503) {
        throw new ServiceUnavailable('Server is currently overloaded. Please try again later.');
      } else if (
        lambdaTriggered.statusCode === 413 ||
        (lambdaTriggered.error &&
          typeof lambdaTriggered.error === 'string' &&
          lambdaTriggered.error.includes('payload is too large'))
      ) {
        throw new PayloadTooLarge(
          `Content too large for processing. Please reduce your content or upgrade your plan.`
        );
      }
    }

    if (lambdaTriggered && lambdaTriggered.success) {
      return {
        jobId: jobId,
        timestamp: new Date().toISOString(),
        status: STATUS_GEN.register,
      };
    }

    // If Lambda failed, use local fallback processing
    logger.warn(`Failed to trigger Lambda for job ${jobId}, will use fallback processing`);

    const result = await this.processWithQueue(dataSend);
    return {
      jobId: result.jobId || jobId,
      timestamp: new Date().toISOString(),
      status: result.status,
    };
  }

  /**
   * Queue-based content generation processing
   *
   * This approach uses a local queue system (BullMQ) to process content generation, which is good for:
   * - Controlled resource utilization on your own infrastructure
   * - Predictable processing costs
   * - Direct monitoring and control of the processing pipeline
   *
   * @param dataSend Object containing job data (content, jobId, etc.)
   * @returns Response with job tracking information
   */
  private async processWithQueue(
    dataSend: ContentGenerationJobDataInterface
  ): Promise<GenerateContentResponseInterface> {
    const { jobId } = dataSend;

    const job = await queue.addJob(this.WORKER_NAME, this.JOB_NAME, dataSend, {
      removeOnComplete: true,
      removeOnFail: 5000,
    });

    if (!job) {
      throw new InternalServerError('Server Busy');
    }

    return {
      jobId: jobId,
      timestamp: new Date().toISOString(),
      status: STATUS_GEN.register,
    };
  }
}

export const generativeService = new GenerativeService();
