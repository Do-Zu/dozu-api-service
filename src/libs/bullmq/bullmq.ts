import { Queue, Worker, Job, QueueEvents, ConnectionOptions } from 'bullmq';
import { RedisManager } from '../redis/redis.connect';
import logger from '@/utils/logger';
import Redis from 'ioredis';
import EventEmitter from 'events';

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
  private redis!: Redis;
  private events: EventEmitter = new EventEmitter();
  private isRedisAvailable = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly CONNECTION_TIMEOUT_MS = 5000; // 5 seconds timeout
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private connectionAttempts = 0;

  private constructor() {
    this.initializeRedisConnection();
  }

  public static getInstance(): BullMQService {
    if (!BullMQService.instance) {
      BullMQService.instance = new BullMQService();
    }
    return BullMQService.instance;
  }

  private initializeRedisConnection(): void {
    try {
      this.connectionAttempts++;
      logger.info(
        `Initializing BullMQ Redis connection (attempt ${this.connectionAttempts}/${this.MAX_RETRY_ATTEMPTS})...`
      );

      // Set a timeout to prevent hanging
      this.connectionTimeout = setTimeout(() => {
        if (!this.isRedisAvailable) {
          logger.error(`BullMQ Redis connection timed out after ${this.CONNECTION_TIMEOUT_MS}ms`);
          this.handleConnectionFailure();
        }
      }, this.CONNECTION_TIMEOUT_MS);

      // Get Redis connection
      const redisManager = RedisManager.getInstance();

      // Set up event listener for Redis
      redisManager.onEvent('ready', () => {
        this.clearConnectionTimeout();
        this.isRedisAvailable = true;
        this.connectionAttempts = 0; // Reset attempts on successful connection
        logger.info('BullMQ Redis connection established successfully');
        this.events.emit('redis:ready');
      });

      redisManager.onEvent('error', error => {
        logger.error(`BullMQ Redis connection error: ${error}`);
        this.handleConnectionFailure();
      });

      redisManager.onEvent('max_retries_exceeded', () => {
        logger.error('BullMQ Redis max retries exceeded');
        this.handleConnectionFailure();
      });

      // Initialize Redis connection
      this.redis = redisManager.connect();

      // Test if connection is ready immediately
      if (this.redis.status === 'ready') {
        this.clearConnectionTimeout();
        this.isRedisAvailable = true;
        logger.info('BullMQ Redis connection is already ready');
        this.events.emit('redis:ready');
      }
    } catch (error) {
      this.clearConnectionTimeout();
      logger.error(
        `Failed to initialize BullMQ Redis connection: ${error instanceof Error ? error.message : String(error)}`
      );
      this.handleConnectionFailure();
    }
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private handleConnectionFailure(): void {
    this.clearConnectionTimeout();
    this.isRedisAvailable = false;

    if (this.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
      logger.warn(
        `BullMQ Redis connection attempt failed. Retrying in 1 second... (${this.connectionAttempts}/${this.MAX_RETRY_ATTEMPTS})`
      );
      setTimeout(() => this.initializeRedisConnection(), 1000);
    } else {
      logger.error(
        `BullMQ Redis connection failed after ${this.MAX_RETRY_ATTEMPTS} attempts. Queue operations will be logged but not executed.`
      );
      this.events.emit('redis:failed');
      // Use a fallback mock Redis client
      this.setUpFallbackQueues();
    }
  }

  private setUpFallbackQueues(): void {
    logger.warn('Setting up fallback queue handling - jobs will be logged but not processed');
    // You might want to implement fallback behavior here
    // For example, logging jobs to a file instead of Redis
  }

  // private getConnectionOpts(): ConnectionOptions {
  //   return {
  //     connection: this.redis,
  //     // Add these timeout options for bullMQ connections
  //     timeout: 5000, // 5 seconds
  //     lockDuration: 30000, // 30 seconds
  //   };
  // }

  public createQueue(name: string): Queue {
    // Check if queue already exists
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    try {
      // If Redis is not available, log warning and return mock queue
      if (!this.isRedisAvailable) {
        logger.warn(
          `Attempting to create queue "${name}" but Redis is not available. Creating mock queue.`
        );
        const mockQueue = this.createMockQueue(name);
        this.queues.set(name, mockQueue as unknown as Queue);
        return mockQueue as unknown as Queue;
      }

      // Create real queue
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

      // Set up error handlers
      queue.on('error', error => {
        logger.error(`Queue ${name} error: ${error.message}`);
      });

      this.queues.set(name, queue);
      this.createQueueEvents(name);
      return queue;
    } catch (error) {
      logger.error(
        `Error creating queue ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
      const mockQueue = this.createMockQueue(name);
      this.queues.set(name, mockQueue as unknown as Queue);
      return mockQueue as unknown as Queue;
    }
  }

  private createMockQueue(name: string): any {
    logger.warn(`Creating mock queue for "${name}"`);

    return {
      name,
      add: async (jobName: string, data: any, options?: JobOptions) => {
        logger.info(`[MOCK QUEUE ${name}] Would add job "${jobName}" with data:`, data);
        return {
          id: `mock-${Date.now()}`,
          name: jobName,
          data,
          opts: options,
        };
      },
      getJob: async (jobId: string) => {
        logger.info(`[MOCK QUEUE ${name}] Would get job ${jobId}`);
        return null;
      },
      on: (event: string, handler: Function) => {
        logger.debug(`[MOCK QUEUE ${name}] Registered handler for "${event}" event`);
        return { name, event };
      },
    };
  }

  private createQueueEvents(name: string): QueueEvents {
    if (this.queueEvents.has(name)) {
      return this.queueEvents.get(name)!;
    }

    try {
      if (!this.isRedisAvailable) {
        logger.warn(`Cannot create queue events for "${name}" - Redis is not available`);
        return {} as QueueEvents;
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

      queueEvents.on('error', error => {
        logger.error(`Queue events error for ${name}: ${error.message}`);
      });

      this.queueEvents.set(name, queueEvents);
      return queueEvents;
    } catch (error) {
      logger.error(
        `Error creating queue events for ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
      return {} as QueueEvents;
    }
  }

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

    try {
      if (!this.isRedisAvailable) {
        logger.warn(`Cannot create worker for queue "${name}" - Redis is not available`);
        return {} as Worker;
      }

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
          lockDuration: 30000, // 30 seconds
          lockRenewTime: 15000, // 15 seconds
          stalledInterval: 30000, // Check for stalled jobs every 30 seconds
        }
      );

      worker.on('error', err => {
        logger.error(`Worker error in queue ${name}:`, err);
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed in worker ${name}:`, err);
      });

      worker.on('stalled', jobId => {
        logger.warn(`Job ${jobId} stalled in worker ${name}`);
      });

      this.workers.set(name, worker);
      return worker;
    } catch (error) {
      logger.error(
        `Error creating worker for queue ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
      return {} as Worker;
    }
  }

  public async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Job<T> | null> {
    try {
      const queue = this.createQueue(queueName);
      if (!this.isRedisAvailable) {
        logger.warn(`Cannot add job "${jobName}" to queue "${queueName}" - Redis is not available`);
        logger.info(`[WOULD ADD JOB] Queue: ${queueName}, Job: ${jobName}, Data:`, data);
        return null;
      }
      return await queue.add(jobName, data, options);
    } catch (error) {
      logger.error(
        `Error adding job "${jobName}" to queue "${queueName}": ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  public async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    try {
      const queue = this.createQueue(queueName);
      if (!this.isRedisAvailable) {
        logger.warn(`Cannot get job ${jobId} from queue "${queueName}" - Redis is not available`);
        return undefined;
      }
      return await queue.getJob(jobId);
    } catch (error) {
      logger.error(
        `Error getting job ${jobId} from queue "${queueName}": ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      this.clearConnectionTimeout();

      // Close all workers first
      for (const [name, worker] of this.workers.entries()) {
        try {
          logger.info(`Closing worker for queue ${name}...`);
          await worker.close();
        } catch (error) {
          logger.warn(
            `Error closing worker for queue ${name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Close all queue events
      for (const [name, queueEvents] of this.queueEvents.entries()) {
        try {
          logger.info(`Closing queue events for ${name}...`);
          await queueEvents.close();
        } catch (error) {
          logger.warn(
            `Error closing queue events for ${name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Close all queues
      for (const [name, queue] of this.queues.entries()) {
        try {
          logger.info(`Closing queue ${name}...`);
          await queue.close();
        } catch (error) {
          logger.warn(
            `Error closing queue ${name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Only disconnect Redis if it's available
      if (this.isRedisAvailable && this.redis) {
        logger.info('Disconnecting from Redis...');
        await this.redis.quit();
      }

      logger.info('BullMQ service disconnected successfully');
    } catch (error) {
      logger.error(
        `Error during BullMQ service disconnect: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  public onEvent(event: string, handler: (...args: any[]) => void): void {
    this.events.on(event, handler);
  }

  public isReady(): boolean {
    return this.isRedisAvailable;
  }

  public retryConnection(): void {
    if (!this.isRedisAvailable) {
      this.connectionAttempts = 0;
      logger.info('Manually retrying BullMQ Redis connection...');
      this.initializeRedisConnection();
    }
  }
}

export const bullMQService = BullMQService.getInstance();
