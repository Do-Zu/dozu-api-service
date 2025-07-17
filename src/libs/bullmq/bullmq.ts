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

export class BullMQService {
    protected static instance: BullMQService;
    protected queues: Map<string, Queue> = new Map();
    protected workers: Map<string, Worker> = new Map();
    protected queueEvents: Map<string, QueueEvents> = new Map();
    protected redis: Redis;

    protected constructor() {
        // this.redisManager = RedisManager.getInstance();
        this.redis = RedisPubSubManager.getInstance().connect();
    }

    // Fix singleton pattern for inheritance
    public static getInstance(): BullMQService {
        if (!this.instance) {
            this.instance = new this();
        }
        return this.instance;
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
     * Made virtual to allow overriding in subclasses
     */
    protected createQueueEvents(name: string): QueueEvents {
        if (this.queueEvents.has(name)) {
            return this.queueEvents.get(name)!;
        }

        const queueEvents = new QueueEvents(name, {
            connection: this.redis,
        });

        // Use template method pattern - call overridable methods
        this.setupQueueEventHandlers(queueEvents, name);

        this.queueEvents.set(name, queueEvents);
        return queueEvents;
    }

    /**
     * Template method for setting up queue event handlers
     * Can be overridden by subclasses for custom behavior
     */
    protected setupQueueEventHandlers(queueEvents: QueueEvents, queueName: string): void {
        queueEvents.on('completed', ({ jobId }) => {
            this.handleJobCompleted(jobId, queueName);
        });

        queueEvents.on('failed', ({ jobId, failedReason }) => {
            this.handleJobFailed(jobId, queueName, failedReason);
        });

        queueEvents.on('stalled', ({ jobId }) => {
            this.handleJobStalled(jobId, queueName);
        });
    }

    /**
     * Virtual methods that can be overridden by subclasses
     */
    protected handleJobCompleted(jobId: string, queueName: string): void {
        logger.info(`Job ${jobId} has completed in queue ${queueName}`);
    }

    protected handleJobFailed(jobId: string, queueName: string, reason: string): void {
        logger.error(`Job ${jobId} has failed in queue ${queueName}: ${reason}`);
    }

    protected handleJobStalled(jobId: string, queueName: string): void {
        logger.warn(`Job ${jobId} has been stalled in queue ${queueName}`);
    }

    /**
     * Creates a worker to process jobs from a queue
     */
    public createWorker(name: string, processor: (job: Job) => Promise<unknown>, concurrency: number = 1): Worker {
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
     * Cleanup resources
     */
    public async cleanup(): Promise<void> {
        // Close all workers
        for (const [name, worker] of this.workers) {
            await worker.close();
            logger.info(`Worker for queue ${name} closed`);
        }

        // Close all queue events
        for (const [name, queueEvents] of this.queueEvents) {
            await queueEvents.close();
            logger.info(`QueueEvents for queue ${name} closed`);
        }

        // Close all queues
        for (const [name, queue] of this.queues) {
            await queue.close();
            logger.info(`Queue ${name} closed`);
        }

        // Clear maps
        this.workers.clear();
        this.queueEvents.clear();
        this.queues.clear();
    }

    /**
     *
     */
    public async disconnect() {
        await this.cleanup();
        await this.redis.quit();
    }
}

export const bullMQService = BullMQService.getInstance();
