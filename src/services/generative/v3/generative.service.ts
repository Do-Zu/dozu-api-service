import { Worker, Job, tryCatch } from 'bullmq';
import OpenAI from 'openai';
import { bullMQService as queue } from '@/libs/bullmq/bullmq';
import { BaseGenerativeService } from './base/base.abstract';
import { convertJsonToArray, generatePromptText } from '@/utils/prompt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import { redis, redisInstance } from '@/libs/redis/redis.connect';

class GenerativeService extends BaseGenerativeService {
  private worker: Worker;
  private WORKER_NAME: string = 'WORKER_HANDLER_OPEN_API_INTEGRATE_GEN_CONTENT';
  private JOB_NAME: string = 'GENERATE_FLASHCARD';
  private readonly RESULT_TTL: number = 60 * 5;

  constructor() {
    super();
    this.worker = queue.createWorker(this.WORKER_NAME, this.processor.bind(this));
  }

  private async processor(job: Job) {
    logger.info(`Processing job ${job.id} with data:`, job.data);
    const { content, jobId } = job.data;

    try {
      // Call the background processing method
      const result = await this.generateFlashcardsByLLMBackGround(content);

      //   TODO: handle result
      //   emit an event(websocket) to transfer data to client , then close connect
      //   store in redis for get data, after get data will remove
      //   Store in a database

      logger.info(`Successfully processed job ${jobId} with result:`, result);

      await this.storeData(result, jobId);

      return result; // Return result to mark job as completed successfully
    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);
      throw error; // Rethrow to mark the job as failed
    }
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
  public async generateFlashcardsByLLM(content: string) {
    const jobId = uuidv4();

    const jobData = {
      content,
      jobId,
      timestamp: new Date().toISOString(),
    };

    const job = await queue.addJob(this.WORKER_NAME, this.JOB_NAME, jobData);
    logger.info(`Job added to queue with ID: ${job.id}`);

    return {
      jobId: jobId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * @description Generates flashcards using the OpenAI API streaming method
   * @param content The content to generate flashcards from
   * @returns list flashcards
   */
  private async generateFlashcardsByLLMBackGround(content: string): Promise<any> {
    const prompt = generatePromptText(content, 'FLASH_CARD');

    let fullContent = '';

    for await (const chunk of this.streamContentFromGoogleStudio(prompt)) {
      fullContent += chunk;
    }

    const data = convertJsonToArray(fullContent || '[]');

    return {
      quizzes: data,
      text: fullContent,
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
        status: 'completed',
        data: JSON.parse(cachedResult),
      };
    }

    // If not in cache, check job status from queue
    const job = await queue.getJob(this.WORKER_NAME, jobId);

    if (!job) {
      return {
        status: 'not_found',
        message: 'Job not found',
      };
    }

    const state = await job.getState();

    return {
      jobId: job.id,
      status: state,
      data: job.returnvalue,
    };
  }
}

export const generativeService = new GenerativeService();
