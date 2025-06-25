import { DatabaseError, InternalServerError } from '@/core/error';
import { redisInstance, redis } from '@/libs/redis/pub-sub/redisPubsub.connect';
import {
  getAllProviderAvailable,
  getAvailableModels,
  getDefaultProviderWithApiKeyAndModels,
  getRateLimitForModel,
} from '@/repositories/generate/llm/llm.repo';
import logger from '@/utils/logger';

/**
 * Interface for LLM service functionality
 */
export interface InterfaceLLMService {
  isAvailableModel(): Promise<boolean>;
  getModelAvailable(model: string | undefined): Promise<string>;
  isModelAvailable(model: string | undefined): Promise<boolean>;
}

/**
 * Standard options for LLM requests
 */
export interface LLMRequestOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  additionalParams?: Record<string, any>;
}

/**
 * Represents a model available for LLM usage
 */
interface IModelsLLM {
  name: string;
  modelId: number;
  priority: number;
  providerId: number;
  requestPerMinute: number | null;
  requestPerDay: number | null;
}

/**
 * Represents a provider of LLM services
 */
interface IProvidersLLM {
  name: string;
  providerId: number;
  isDefault: boolean;
  index: number;
  baseUrl: string | null;
}

/**
 * Represents API key information for an LLM provider
 */
// interface IApiKeyProviderLLM {
//   status: 'active' | 'inactive' | 'expired' | 'rate_limited';
//   isDefault: boolean;
//   index: number;
//   keyId: number;
//   keyValue: string;
//   keyType: 'free' | 'paid';
// }

/**
 * Abstract base class for LLM service implementations
 * Handles provider configuration, rate limiting, and provider switching
 */
export abstract class BaseLLMProvider {
  private readonly DEFAULT_RATE_LIMIT_PER_MINUTE = 15;
  private readonly DEFAULT_RATE_LIMIT_PER_DATE = 1000;
  private readonly PERCENT_RATE_LIMIT_MODEL_PER_MINUTE = 90;
  private readonly PERCENT_RATE_LIMIT_MODEL_PER_DATE = 98;

  // Service configuration
  protected apiKey: string | null = null;
  protected model: string | null = null;
  protected baseURL: string | null = null;

  // Provider metadata
  private providerName: string | undefined;
  private providerId: number | undefined;
  private modelId: number | undefined;
  private apiKeyId: number | undefined;

  // Rate limiting configuration
  private requestPerMinuteLimit: number;
  private requestPerDateLimit: number;

  // Provider switching state
  private currentModelIndex: number = 0;
  private currentProviderIndex: number = 0;

  // Available resources
  private providers: IProvidersLLM[] = [];
  private modelsAvailable: IModelsLLM[] = [];

  // Initialization state
  private isInitialized = false;

  constructor() {
    this.requestPerMinuteLimit = this.DEFAULT_RATE_LIMIT_PER_MINUTE;
    this.requestPerDateLimit = this.DEFAULT_RATE_LIMIT_PER_DATE;
  }

  /**
   * Abstract Initialize the service for strategy sub class
   */
  protected abstract initialize(): Promise<boolean>;

  /**
   * Abstract generate
   */
  protected abstract generate(
    prompt: string,
    config?: object
  ): Promise<string | Array<any> | object | undefined | null>;

  /**
   * Initialize the service with default configuration
   * Only loads configuration from DB once unless forced
   */
  protected async initialBase(forceRefresh = false): Promise<void> {
    if (!this.isInitialized || forceRefresh) {
      await this.getDefaultLLMProviderFromDatabase();
      this.isInitialized = true;
    }
  }

  /**
   * Load default LLM provider configuration from database
   * Sets up provider, API key, model, and rate limits
   */
  private async getDefaultLLMProviderFromDatabase(): Promise<void> {
    try {
      // Get default provider, API key, and model
      const { apiKey, provider, model } = await getDefaultProviderWithApiKeyAndModels();

      // Set provider configuration
      this.providerId = provider.providerId;
      this.providerName = provider.name;
      this.baseURL = provider.baseUrl;

      // Set API key configuration
      this.apiKeyId = apiKey.keyId;
      this.apiKey = apiKey.keyValue;

      // Set model configuration
      this.model = model.name;
      this.modelId = model.modelId;

      // Load models for current provider and set current model index
      this.modelsAvailable = await getAvailableModels(this.providerId, this.apiKeyId);
      this.currentModelIndex = this.modelsAvailable.findIndex(m => m.modelId === this.modelId);
      if (this.currentModelIndex === -1) this.currentModelIndex = 0;

      // Get rate limit configuration for current model/key
      const apiKeyModel = await getRateLimitForModel(this.apiKeyId, this.modelId);
      if (apiKeyModel) {
        this.requestPerDateLimit = apiKeyModel.requestPerDay;
        this.requestPerMinuteLimit = apiKeyModel.requestPerMinute;
      }

      // Load all available providers for potential switching
      this.providers = await getAllProviderAvailable();
      this.currentProviderIndex = this.providers.findIndex(p => p.providerId === this.providerId);
      if (this.currentProviderIndex === -1) this.currentProviderIndex = 0;

      // logger.info(
      //   `LLM service initialized with provider: ${this.providerName}, model: ${this.model}`
      // );
    } catch (error) {
      const errorMsg = 'Failed to initialize LLM service from database';
      logger.error(`${errorMsg}: ${error}`);
      throw new DatabaseError(errorMsg);
    }
  }

  /**
   * Check and update request rate limiting
   * Returns false if rate limits are exceeded and no model is available
   */
  protected async checkAndUpdateRateLimits(): Promise<boolean> {
    // Ensure initialization
    if (!this.isInitialized || !this.providerId || !this.modelId || !this.apiKeyId) {
      await this.initialBase(true);
    }

    // Validate configuration
    if (!this.validateConfiguration()) {
      throw new InternalServerError('Provider configuration incomplete');
    }

    // Get current usage from Redis
    const { minuteKey, dayKey, currentRequestMinuteUsage, currentRequestDayUsage } =
      await this.getCurrentUsage();

    // Calculate usage percentages
    const minuteUsagePercent = (currentRequestMinuteUsage / this.requestPerMinuteLimit) * 100;
    const dayUsagePercent = (currentRequestDayUsage / this.requestPerDateLimit) * 100;

    // Check if we need to switch models
    if (dayUsagePercent >= this.PERCENT_RATE_LIMIT_MODEL_PER_DATE) {
      logger.warn(
        `Model ${this.model} rate limit ${dayUsagePercent.toFixed(2)}% for this date, switching models`
      );
      return await this.switchToNextModel();
    } else if (minuteUsagePercent > this.PERCENT_RATE_LIMIT_MODEL_PER_MINUTE) {
      logger.warn(
        `Model ${this.model} minute rate limit at ${minuteUsagePercent.toFixed(2)}% switching models`
      );
      return await this.switchToNextModel();
    }

    // Increment usage counters
    await Promise.all([redis.incr(minuteKey), redis.incr(dayKey)]);

    return true;
  }

  /**
   * Get current API usage from Redis
   */
  private async getCurrentUsage(): Promise<{
    minuteKey: string;
    dayKey: string;
    currentRequestMinuteUsage: number;
    currentRequestDayUsage: number;
  }> {
    // Define keys for rate limit tracking
    const minuteKey = `llm:rpm:${this.providerId}:${this.modelId}:${this.apiKeyId}`;
    const dayKey = `llm:rpd:${this.providerId}:${this.modelId}:${this.apiKeyId}`;

    // Get current usage from Redis (multi-get for performance)
    const [minuteUsage, dayUsage] = await Promise.all([
      redisInstance.get(minuteKey),
      redisInstance.get(dayKey),
    ]);

    let currentRequestMinuteUsage = parseInt(minuteUsage) || 0;
    let currentRequestDayUsage = parseInt(dayUsage) || 0;

    // Initialize counters if not exist
    const initializationPromises = [];
    if (!currentRequestDayUsage) {
      initializationPromises.push(redisInstance.set(dayKey, 1, 86400)); // 24h
    }
    if (!currentRequestMinuteUsage) {
      initializationPromises.push(redisInstance.set(minuteKey, 1, 60)); // 60s
    }

    if (initializationPromises.length > 0) {
      await Promise.all(initializationPromises);
    }

    return {
      minuteKey,
      dayKey,
      currentRequestMinuteUsage,
      currentRequestDayUsage,
    };
  }

  /**
   * Validates that all required configuration is available
   */
  private validateConfiguration(): boolean {
    return !!(
      this.providerName &&
      this.model &&
      this.apiKey &&
      this.providerId &&
      this.modelId &&
      this.apiKeyId
    );
  }

  /**
   * Switch to next available model when rate limits are exceeded
   * Returns false if no model is available
   */
  private async switchToNextModel(): Promise<boolean> {
    const lengthModelAvailable = this.modelsAvailable.length;

    // If there's only one model, switching is not possible
    if (lengthModelAvailable <= 1) {
      logger.warn('No alternative models available for switching');
      return false;
    }

    // Try each model in order
    for (let attempt = 0; attempt < lengthModelAvailable; attempt++) {
      // Calculate next model index with wraparound
      const nextModelIndex = (this.currentModelIndex + 1 + attempt) % lengthModelAvailable;
      const candidateModel = this.modelsAvailable[nextModelIndex];

      // Skip if this model is also rate-limited
      this.modelId = candidateModel.modelId;
      const isRateLimited = await this.isCurrentModelRateLimited();

      if (!isRateLimited) {
        // Update to new model
        this.model = candidateModel.name;
        this.currentModelIndex = nextModelIndex;
        this.requestPerDateLimit = candidateModel.requestPerDay ?? this.DEFAULT_RATE_LIMIT_PER_DATE;
        this.requestPerMinuteLimit =
          candidateModel.requestPerMinute ?? this.DEFAULT_RATE_LIMIT_PER_MINUTE;

        logger.info(`Switched to model ${this.model} due to rate limiting`);
        return true;
      }
    }

    // All models are rate-limited
    logger.error('All models are rate-limited');
    return false;
  }

  /**
   * Check if current model is rate limited
   * Consolidates checks for both minute and day limits
   */
  private async isCurrentModelRateLimited(): Promise<boolean> {
    return (
      (await this.isCurrentModelRateLimitForMinute()) ||
      (await this.isCurrentModelRateLimitForDay())
    );
  }

  /**
   * Check if current model exceeds minute rate limit
   */
  private async isCurrentModelRateLimitForMinute(): Promise<boolean> {
    const minuteKey = `llm:rpm:${this.providerId}:${this.modelId}:${this.apiKeyId}`;
    let currentRequestMinuteUsage: number = parseInt(await redisInstance.get(minuteKey)) || 0;
    const minuteUsagePercent = (currentRequestMinuteUsage / this.requestPerMinuteLimit) * 100;
    return minuteUsagePercent > this.PERCENT_RATE_LIMIT_MODEL_PER_MINUTE;
  }

  /**
   * Check if current model exceeds daily rate limit
   */
  private async isCurrentModelRateLimitForDay(): Promise<boolean> {
    const dayKey = `llm:rpd:${this.providerId}:${this.modelId}:${this.apiKeyId}`;
    let currentRequestDayUsage = parseInt(await redisInstance.get(dayKey)) || 0;
    const dayUsagePercent = (currentRequestDayUsage / this.requestPerDateLimit) * 100;
    return dayUsagePercent > this.PERCENT_RATE_LIMIT_MODEL_PER_DATE;
  }

  /**
   * Check if the LLM service can process requests
   * Ensures provider is configured and rate limits are respected
   */
  public async canLLMProcess(): Promise<boolean> {
    try {
      // Ensure initialization
      if (!this.apiKey || !this.model || !this.baseURL) {
        await this.initialBase(true);
      }

      // Check rate limits and update usage
      const canProcess = await this.checkAndUpdateRateLimits();
      return canProcess && !!(this.apiKey && this.model && this.baseURL);
    } catch (error) {
      logger.error(`Error checking LLM availability: ${error}`);
      return false;
    }
  }

  /**
   * Get the current LLM provider name
   */
  protected async getProviderLLM(): Promise<string | undefined> {
    return this.providerName;
  }

  /**
   * Get list of available models for current provider
   */
  protected async getModelsAvailable(): Promise<IModelsLLM[]> {
    return this.modelsAvailable;
  }
}
