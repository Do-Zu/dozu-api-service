import { DatabaseError, InternalServerError } from '@/core/error';
import { redis, redisInstance } from '@/libs/redis/redis.connect';
import {
  getAllProviderAvailable,
  getAvailableModels,
  getDefaultProviderWithApiKeyAndModels,
  getNextApiKey,
  getRateLimitForModel,
} from '@/repositories/generate/llm/llm.repo';
import logger from '@/utils/logger';

export interface InterfaceLLMService {
  isAvailableModel(): Promise<boolean>;
  getModelAvailable(model: string | undefined): Promise<string>;
  isModelAvailable(model: string | undefined): Promise<boolean>;
}

export interface LLMRequestOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  additionalParams?: Record<string, any>;
}

interface IModelsLLM {
  name: string;
  modelId: number;
  priority: number;
  providerId: number;
  requestPerMinute: number | null;
  requestPerDay: number | null;
}

interface IProvidersLLM {
  name: string;
  providerId: number;
  isDefault: boolean;
  index: number;
  baseUrl: string | null;
}
interface IApiKeyProviderLLM {
  status: 'active' | 'inactive' | 'expired' | 'rate_limited';
  isDefault: boolean;
  index: number;
  keyId: number;
  keyValue: string;
  keyType: 'free' | 'paid';
}

export abstract class AbstractBaseLLMService {
  private readonly DEFAULT_RATE_LIMIT_PER_MINUTE = 15;
  private readonly DEFAULT_RATE_LIMIT_PER_DATE = 1000;
  private readonly PERCENT_RATE_LIMIT_MODEL_PER_MINUTE = 90;
  private readonly PERCENT_RATE_LIMIT_MODEL_PER_DATE = 98;

  protected apiKey: string | null = null;
  protected model: string | null = null;
  protected baseURL: string | null = null;

  private providerName: string | undefined;
  private providerId: number | undefined;
  private modelId: number | undefined;
  private apiKeyId: number | undefined;

  private requestPerMinuteLimit: number;
  private requestPerDateLimit: number;

  private currentModelIndex: number = 0;
  private currentProviderIndex: number = 0;

  private providers: IProvidersLLM[] = [];
  private modelsAvailable: IModelsLLM[] = [];

  constructor() {
    this.requestPerMinuteLimit = this.DEFAULT_RATE_LIMIT_PER_MINUTE;
    this.requestPerDateLimit = this.DEFAULT_RATE_LIMIT_PER_DATE;
    this.initializeFromDatabase();
  }

  protected async initialize(
    model: string | null,
    apiKey: string | null,
    baseURL: string | null
  ): Promise<void> {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
  }

  protected async initializeFromDatabase(): Promise<void> {
    try {
      // Get default provider, API key, and model
      const { apiKey, provider, model } = await getDefaultProviderWithApiKeyAndModels();

      this.providerId = provider.providerId;
      this.providerName = provider.name;
      this.baseURL = provider.baseUrl;

      this.apiKeyId = apiKey.keyId;
      this.apiKey = apiKey.keyValue;

      this.model = model.name;
      this.modelId = model.modelId;

      // Load available models for this provider
      this.modelsAvailable = await getAvailableModels(this.providerId, this.apiKeyId);
      this.currentModelIndex = this.modelsAvailable.findIndex(m => m.modelId === this.modelId);
      if (this.currentModelIndex === -1) this.currentModelIndex = 0;

      // Get rate limit API key model configuration
      const apiKeyModel = await getRateLimitForModel(this.apiKeyId, this.modelId);

      if (apiKeyModel) {
        this.requestPerDateLimit = apiKeyModel.requestPerDay;
        this.requestPerMinuteLimit = apiKeyModel.requestPerMinute;
      }

      // Load all available providers for potential switching
      this.providers = await getAllProviderAvailable();
      this.currentProviderIndex = this.providers.findIndex(p => p.providerId === this.providerId);
      if (this.currentProviderIndex === -1) this.currentProviderIndex = 0;
    } catch (error) {
      console.error('Failed to initialize LLM service from database:', error);
      throw new DatabaseError('Failed to initialize LLM service from database:');
    }
  }

  /**
   * Check and update request rate limiting
   */
  protected async checkAndUpdateRateLimits(): Promise<void> {
    if (!this.providerId || !this.modelId || !this.apiKeyId) {
      await this.initializeFromDatabase();
    }

    if (
      !this.providerName ||
      !this.model ||
      !this.apiKey ||
      !this.providerId ||
      !this.modelId ||
      !this.apiKeyId
    ) {
      throw new InternalServerError('Provider not identified');
    }

    // Get minute rate limit
    const minuteKey = `llm:rpm:${this.providerId}:${this.modelId}:${this.apiKeyId}`;
    let currentRequestMinuteUsage: number = parseInt(await redisInstance.get(minuteKey)) ?? 0;

    // Get day rate limit
    const dayKey = `llm:rpd:${this.providerId}:${this.modelId}:${this.apiKeyId}`;
    let currentRequestDayUsage = parseInt(await redisInstance.get(dayKey)) ?? 0;

    if (!currentRequestDayUsage) {
      await redisInstance.set(dayKey, 1, 86400); // 24h
    }

    if (!currentRequestMinuteUsage) {
      await redisInstance.set(minuteKey, 1, 60); // 60s
    }

    const minuteUsagePercent = (currentRequestMinuteUsage / this.requestPerMinuteLimit) * 100;
    const dayUsagePercent = (currentRequestDayUsage / this.requestPerDateLimit) * 100;

    let isSwitchModel = false;

    // HANDLE RATE LIMIT FOR DATE OF MODEL
    if (dayUsagePercent >= this.PERCENT_RATE_LIMIT_MODEL_PER_DATE) {
      logger.warn(
        `Model ${this.model}  rate limit ${dayUsagePercent.toFixed(2)}%  for this date, switching models`
      );
      isSwitchModel = true;
    }
    // HANDLE RATE LIMIT OVER PERCENT DEFINE
    else if (minuteUsagePercent > this.PERCENT_RATE_LIMIT_MODEL_PER_MINUTE) {
      logger.warn(
        `Model ${this.model} minute rate limit at ${minuteUsagePercent.toFixed(2)}% switching models`
      );
      isSwitchModel = true;
    }

    if (isSwitchModel) {
      const switched = await this.switchToNextModel();

      if (!switched) {
        throw new InternalServerError('Server Busy!');
      }
    } else {
      // Increment the counters
      await Promise.allSettled([await redis.incr(minuteKey), await redis.incr(dayKey)]);
    }
  }

  /**
   * * This method is called when the user switches the model in the UI or rate-limit for current model.
   */
  private async switchToNextModel(): Promise<boolean> {
    const lengthModelAvailable = this.modelsAvailable.length;

    // If there's only one model, we need to switch API keys instead
    if (lengthModelAvailable <= 1) {
      return false;
    }

    // Get minute rate limit

    for (let index = this.currentModelIndex + 1; index < lengthModelAvailable; index++) {
      const isModelRateLimitPerMinute = await this.isCurrentModelRateLimitForMinute();

      if (isModelRateLimitPerMinute) {
        continue;
      }

      const nextModelIndex = index % lengthModelAvailable;
      const nextModel = this.modelsAvailable[nextModelIndex];

      //Update information model
      this.model = nextModel.name;
      this.modelId = nextModel.modelId;
      this.currentModelIndex = nextModelIndex;
      this.requestPerDateLimit = nextModel.requestPerDay ?? this.DEFAULT_RATE_LIMIT_PER_DATE;
      this.requestPerMinuteLimit = nextModel.requestPerMinute ?? this.DEFAULT_RATE_LIMIT_PER_MINUTE;

      return true;
    }

    // When all models of provider is rate limit
    return false;
  }

  private async isCurrentModelRateLimitForMinute(): Promise<boolean> {
    const minuteKey = `llm:rpm:${this.providerId}:${this.modelId}:${this.apiKeyId}`;

    let currentRequestMinuteUsage: number = parseInt(await redisInstance.get(minuteKey));

    const minuteUsagePercent = (currentRequestMinuteUsage / this.requestPerMinuteLimit) * 100;

    return minuteUsagePercent > this.PERCENT_RATE_LIMIT_MODEL_PER_MINUTE;
  }

  private async isCurrentModelRateLimitForDay(): Promise<boolean> {
    const dayKey = `llm:rpd:${this.providerId}:${this.modelId}:${this.apiKeyId}`;
    let currentRequestDayUsage = parseInt(await redisInstance.get(dayKey));

    const dayUsagePercent = (currentRequestDayUsage / this.requestPerDateLimit) * 100;

    return dayUsagePercent > this.PERCENT_RATE_LIMIT_MODEL_PER_DATE;
  }

  public async canLLMProcess(): Promise<boolean> {
    try {
      // Check if we have valid configuration
      if (!this.apiKey || !this.model || !this.baseURL) {
        await this.initializeFromDatabase();
      }

      // Check rate limits and update usage
      await this.checkAndUpdateRateLimits();
      //
      return !!(this.apiKey && this.model && this.baseURL);
    } catch (error) {
      console.error(`Error checking LLM availability: ${error}`);
      return false;
    }
  }

  protected async getProviderLLM(): Promise<string | undefined> {
    return this.providerName;
  }

  protected async getModelsAvailable(): Promise<IModelsLLM[]> {
    return this.modelsAvailable;
  }
}
