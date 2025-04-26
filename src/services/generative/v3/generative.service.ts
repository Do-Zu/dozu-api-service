import { Worker, Job } from 'bullmq';
import { bullMQService as queue } from '@/libs/bullmq/bullmq';
import { BaseGenerativeService } from './base/base.abstract';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import { redisInstance } from '@/libs/redis/redis.connect';
import { lambdaService } from './provider/lambda.service';
import { sseManager } from '@/services/sse/sse.service';
import { IBodyRequestGenContent } from './types';
import { STATUS_GEN } from './utils/constant';

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
    const { data, jobId } = job.data;

    // Check if a client is waiting for this specific job
    if (sseManager.isClientConnected(jobId)) {
      //immediately send the data via SSE
      const clientNotified = sseManager.sendEvent(jobId, data);
      if (clientNotified) {
        logger.info(`Data sent to client for job ${jobId}`);
      }
    } else {
      logger.info(`No client connected for job ${jobId}, storing result in Redis`);
    }

    // Always store in Redis for potential later retrieval
    await this.storeData(data, jobId);
  }

  private async storeData(data: any, jobId: string) {
    const key = `flashcard:result:${jobId}`;
    await redisInstance.set(key, data, this.RESULT_TTL);
  }

  /**
   * @description Create job and push into queue
   * @param content The content to generate flashcards from
   * @returns Object with jobId for tracking
   */
  public async registerGenerateContentByLLM({ content, type }: IBodyRequestGenContent) {
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

    const dataSend = {
      jobId,
      content,
      queue_name: this.WORKER_NAME,
      job_name: this.JOB_NAME,
      type: typeSending,
    };

    //LAMBDA FUNCTION PROCESS
    const lambdaTriggered = await lambdaService.triggerContentGeneration(dataSend, 'FLASH_CARD');

    if (lambdaTriggered) {
      return {
        jobId: jobId,
        timestamp: new Date().toISOString(),
        status: STATUS_GEN.register,
      };
    }

    logger.warn(`Failed to trigger Lambda for job ${jobId}, will use fallback processing`);
    // fall back process
    return await this.generateContentByLLMBackGround(content);
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
  public async getJobStatus(jobId: string): Promise<any> {
    // First try to get cached result from Redis
    const cachedResult = await redisInstance.get(`flashcard:result:${jobId}`);

    if (cachedResult) {
      return {
        jobId,
        status: STATUS_GEN.completed,
        data: cachedResult,
      };
    }

    // If not in cache, check job status from queue
    const job = await queue.getJob(this.WORKER_NAME, jobId);

    if (!job) {
      return {
        status: STATUS_GEN.not_found,
        message: 'Job not found',
      };
    }

    const state = await job.getState();

    return {
      jobId: job?.data?.jobId,
      jobIndex: job.id,
      status: state,
      data: job.returnvalue,
    };
  }
}

export const generativeService = new GenerativeService();
