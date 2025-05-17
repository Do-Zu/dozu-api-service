import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { RedisPubSubManager } from '../redis/pub-sub/redisPubsub.connect';
import logger from '@/utils/logger';
import Redis from 'ioredis';

export interface JobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  delay?: number;
  priority?: number;
}

class BullMQService {
  private static instance: BullMQService;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  // private redisManager: RedisManager;
  private redis: Redis;

  private constructor() {
    // this.redisManager = RedisManager.getInstance();
    this.redis = RedisPubSubManager.getInstance().connect();
  }

  public static getInstance(): BullMQService {
    if (!BullMQService.instance) {
      BullMQService.instance = new BullMQService();
    }
    return BullMQService.instance;
  }

  public createQueue(name: string): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }
    const queue = new Queue(name, {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
      },
    });

    this.queues.set(name, queue);
    this.createQueueEvents(name);
    return queue;
  }

  /**
   * Creates a QueueEvents instance to listen to queue events
   */
  private createQueueEvents(name: string): QueueEvents {
    if (this.queueEvents.has(name)) {
      return this.queueEvents.get(name)!;
    }
    const queueEvents = new QueueEvents(name, {
      connection: this.redis,
    });
    queueEvents.on('completed', ({ jobId }) => {
      logger.info(`Job ${jobId} has completed in queue ${name}`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${jobId} has failed in queue ${name}: ${failedReason}`);
    });

    queueEvents.on('stalled', ({ jobId }) => {
      logger.warn(`Job ${jobId} has been stalled in queue ${name}`);
    });

    this.queueEvents.set(name, queueEvents);
    return queueEvents;
  }

  /**
   * Creates a worker to process jobs from a queue
   */

  public createWorker(
    name: string,
    processor: (job: Job) => Promise<unknown>,
    concurrency: number = 1
  ): Worker {
    if (this.workers.has(name)) {
      return this.workers.get(name)!;
    }

    // Ensure the queue exists
    this.createQueue(name);

    const worker = new Worker(
      name,
      async (job: Job) => {
        logger.info(`Processing job ${job.id} from queue ${name}`);
        try {
          return await processor(job);
        } catch (error) {
          logger.error(`Error processing job ${job.id} from queue ${name}:`, error);
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: concurrency,
        autorun: true,
      }
    );

    worker.on('error', err => {
      logger.error(`Worker error in queue ${name}:`, err);
    });

    this.workers.set(name, worker);

    return worker;
  }

  /**
   * Adds a job to a queue
   */
  public async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.createQueue(queueName);
    return queue.add(jobName, data, options);
  }

  /**
   * Gets a job from a queue by id
   */
  public async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.createQueue(queueName);
    return queue.getJob(jobId);
  }

  /**
   *
   */
  public async disconnect() {
    await this.redis.quit();
  }
}

export const bullMQService = BullMQService.getInstance();
