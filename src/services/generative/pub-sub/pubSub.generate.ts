import { BullMQService } from '@/libs/bullmq/bullmq';
import logger from '@/utils/logger';
import { generativeService } from '../v3/generative.service';

export class PubSubGenerateManager extends BullMQService {
    protected static instance: PubSubGenerateManager;
    private jobCompletionHandlers: Map<string, (jobId: string) => Promise<void> | void> = new Map();

    constructor() {
        super();
    }

    public static override getInstance(): PubSubGenerateManager {
        if (!PubSubGenerateManager.instance) {
            PubSubGenerateManager.instance = new PubSubGenerateManager();
        }
        return PubSubGenerateManager.instance;
    }

    // public registerJobCompletionHandler(queueName: string, handler: (jobId: string) => Promise<void> | void): void {
    //     this.jobCompletionHandlers.set(queueName, handler);
    // }

    /**
     * Override the event handlers for PubSub-specific behavior
     */
    protected override handleJobCompleted(jobId: string, queueName: string): void {
        generativeService.checkStatusDataGeneratedCache(jobId);
    }

    protected override handleJobFailed(jobId: string, queueName: string, reason: string): void {
        super.handleJobFailed(jobId, queueName, reason);

        logger.error(`[PubSub] Generation job ${jobId} failed in queue ${queueName}. Reason: ${reason}`);
    }

    protected override handleJobStalled(jobId: string, queueName: string): void {
        super.handleJobStalled(jobId, queueName);

        logger.warn(`[PubSub] Generation job ${jobId} stalled in queue ${queueName}. Investigating...`);
        // You can add monitoring, alerting, or auto-recovery logic here
    }
}

export const pubSubGenerateManager = PubSubGenerateManager.getInstance();
