import { redisInstance } from '@/libs/redis/pub-sub/redisPubsub.connect';
import logger from '@/utils/logger';

/**
 * Configuration for rate limit cooldown
 */
export interface RateLimitCooldownConfig {
    /** Cooldown duration in seconds (default: 1 hour = 3600 seconds) */
    cooldownDurationSeconds: number;
    /** Redis key prefix for rate limit markers */
    keyPrefix: string;
}

/**
 * Information about a rate-limited model
 */
export interface RateLimitedModelInfo {
    modelId: number;
    providerId: number;
    apiKeyId: number;
    rateLimitedAt: string;
    cooldownUntil: string;
    reason: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: RateLimitCooldownConfig = {
    cooldownDurationSeconds: 3600, // 1 hour
    keyPrefix: 'llm:rate_limit_429',
};

/**
 * RateLimitManager - Manages 429 rate limit cooldowns for LLM models
 *
 * This service follows the Single Responsibility Principle by handling
 * only rate limit cooldown management, separate from the main LLM service.
 *
 * Features:
 * - Mark models as rate-limited with configurable cooldown period
 * - Check if a model is currently in cooldown
 * - Clear cooldown markers when needed
 * - Retrieve information about rate-limited models
 */
export class RateLimitManager {
    private readonly config: RateLimitCooldownConfig;

    constructor(config: Partial<RateLimitCooldownConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Generate Redis key for rate limit marker
     * @param providerId - LLM provider ID
     * @param modelId - Model ID
     * @param apiKeyId - API key ID
     */
    private generateRateLimitKey(providerId: number, modelId: number, apiKeyId: number): string {
        return `${this.config.keyPrefix}:${providerId}:${modelId}:${apiKeyId}`;
    }

    /**
     * Mark a model as rate-limited (429 response received)
     * Sets a Redis key with TTL for the cooldown period
     *
     * @param providerId - LLM provider ID
     * @param modelId - Model ID
     * @param apiKeyId - API key ID
     * @param reason - Optional reason for rate limiting
     * @returns Promise<boolean> - true if successfully marked
     */
    public async markModelAsRateLimited(
        providerId: number,
        modelId: number,
        apiKeyId: number,
        reason: string = '429 Too Many Requests'
    ): Promise<boolean> {
        try {
            const key = this.generateRateLimitKey(providerId, modelId, apiKeyId);
            const now = new Date();
            const cooldownUntil = new Date(now.getTime() + this.config.cooldownDurationSeconds * 1000);

            const rateLimitInfo: RateLimitedModelInfo = {
                modelId,
                providerId,
                apiKeyId,
                rateLimitedAt: now.toISOString(),
                cooldownUntil: cooldownUntil.toISOString(),
                reason,
            };

            await redisInstance.set(key, rateLimitInfo, this.config.cooldownDurationSeconds);

            logger.warn(
                `Model ${modelId} (provider: ${providerId}) marked as rate-limited until ${cooldownUntil.toISOString()}`,
                { rateLimitInfo }
            );

            return true;
        } catch (error) {
            logger.error(
                `Failed to mark model as rate-limited: ${error instanceof Error ? error.message : String(error)}`
            );
            return false;
        }
    }

    /**
     * Check if a model is currently in rate limit cooldown
     *
     * @param providerId - LLM provider ID
     * @param modelId - Model ID
     * @param apiKeyId - API key ID
     * @returns Promise<boolean> - true if model is in cooldown
     */
    public async isModelInCooldown(providerId: number, modelId: number, apiKeyId: number): Promise<boolean> {
        try {
            const key = this.generateRateLimitKey(providerId, modelId, apiKeyId);
            const result = await redisInstance.get(key);
            return result !== null && result !== undefined;
        } catch (error) {
            logger.error(
                `Failed to check rate limit cooldown: ${error instanceof Error ? error.message : String(error)}`
            );
            // In case of error, assume not in cooldown to avoid blocking requests
            return false;
        }
    }

    /**
     * Get rate limit information for a model
     *
     * @param providerId - LLM provider ID
     * @param modelId - Model ID
     * @param apiKeyId - API key ID
     * @returns Promise<RateLimitedModelInfo | null> - Rate limit info or null if not rate-limited
     */
    public async getRateLimitInfo(
        providerId: number,
        modelId: number,
        apiKeyId: number
    ): Promise<RateLimitedModelInfo | null> {
        try {
            const key = this.generateRateLimitKey(providerId, modelId, apiKeyId);
            const result = await redisInstance.get(key);

            if (!result) {
                return null;
            }

            return JSON.parse(result) as RateLimitedModelInfo;
        } catch (error) {
            logger.error(`Failed to get rate limit info: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Clear rate limit cooldown for a model (manual override)
     *
     * @param providerId - LLM provider ID
     * @param modelId - Model ID
     * @param apiKeyId - API key ID
     * @returns Promise<boolean> - true if successfully cleared
     */
    public async clearRateLimitCooldown(providerId: number, modelId: number, apiKeyId: number): Promise<boolean> {
        try {
            const key = this.generateRateLimitKey(providerId, modelId, apiKeyId);
            await redisInstance.del(key);

            logger.info(`Rate limit cooldown cleared for model ${modelId} (provider: ${providerId})`);
            return true;
        } catch (error) {
            logger.error(
                `Failed to clear rate limit cooldown: ${error instanceof Error ? error.message : String(error)}`
            );
            return false;
        }
    }

    /**
     * Get remaining cooldown time in seconds
     *
     * @param providerId - LLM provider ID
     * @param modelId - Model ID
     * @param apiKeyId - API key ID
     * @returns Promise<number> - Remaining seconds, 0 if not in cooldown
     */
    public async getRemainingCooldownSeconds(providerId: number, modelId: number, apiKeyId: number): Promise<number> {
        try {
            const info = await this.getRateLimitInfo(providerId, modelId, apiKeyId);

            if (!info) {
                return 0;
            }

            const cooldownUntil = new Date(info.cooldownUntil);
            const now = new Date();
            const remainingMs = cooldownUntil.getTime() - now.getTime();

            return Math.max(0, Math.ceil(remainingMs / 1000));
        } catch (error) {
            logger.error(`Failed to get remaining cooldown: ${error instanceof Error ? error.message : String(error)}`);
            return 0;
        }
    }

    /**
     * Get the configured cooldown duration
     */
    public getCooldownDuration(): number {
        return this.config.cooldownDurationSeconds;
    }
}

// Singleton instance for global usage
export const rateLimitManager = new RateLimitManager();
