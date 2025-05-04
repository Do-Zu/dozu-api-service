import OpenAI from 'openai';
import {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import { AbstractBaseLLMService } from '../base-llm.abstract';
import logger from '@/utils/logger';

/**
 * Implements AbstractBaseLLMService for OpenAI API
 * Handles connection to OpenAI, streaming, and client management
 */
export class OpenAIService extends AbstractBaseLLMService {
  private openai: OpenAI | undefined;
  private isClientInitialized = false;

  constructor() {
    super();
    this.initializeOpenAI();
  }

  /**
   * Initializes the OpenAI client if API key and base URL are available
   * @returns true if initialization was successful, false otherwise
   */
  private async initializeOpenAI(): Promise<boolean> {
    try {
      // Initialize base service first to load provider configuration
      await this.initial();

      // Check for required configuration
      if (!this.validateConfig()) {
        return false;
      }

      // Create OpenAI client with configuration
      this.openai = new OpenAI({
        apiKey: this.apiKey!,
        baseURL: this.baseURL!,
      });

      this.isClientInitialized = true;
      logger.info('OpenAI client initialized successfully');
      return true;
    } catch (error) {
      this.handleInitError(error);
      return false;
    }
  }

  /**
   * Validates that configuration is complete for client initialization
   */
  private validateConfig(): boolean {
    if (!this.apiKey) {
      logger.warn('Missing API key for OpenAI initialization');
      return false;
    }

    if (!this.baseURL) {
      logger.warn('Missing base URL for OpenAI initialization');
      return false;
    }

    return true;
  }

  /**
   * Handles and logs initialization errors
   */
  private handleInitError(error: unknown): void {
    logger.error(
      `Failed to initialize OpenAI client: ${error instanceof Error ? error.message : String(error)}`
    );
    this.isClientInitialized = false;
  }

  /**
   * Check if the service is ready to handle requests
   */
  public isAvailable(): boolean {
    return this.isClientInitialized && this.openai instanceof OpenAI;
  }

  /**
   * Gets the current model configured for requests
   */
  public getModel(): string | null {
    return this.model;
  }

  /**
   * Gets the API key used for authentication
   */
  public getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Gets the provider base URL
   */
  public getProviderBaseUrl(): string | null {
    return this.baseURL;
  }

  /**
   * Gets the OpenAI client instance
   */
  public getOpenAI(): OpenAI | undefined {
    return this.openai;
  }

  /**
   * Creates a streaming chat completion
   * @param messages The messages to send to the API
   * @param config Additional configuration options
   * @returns A streaming response or undefined if service is unavailable
   */
  public async createStream(
    messages: Array<ChatCompletionMessageParam>,
    config?: Omit<ChatCompletionCreateParamsStreaming, 'model'>
  ) {
    // Check if service is available
    if (!this.isAvailable()) {
      logger.warn('OpenAI service unavailable for streaming request');
      return undefined;
    }

    // Check rate limits
    const canProcess = await this.canLLMProcess();
    if (!canProcess) {
      logger.warn('Rate limits exceeded for OpenAI streaming request');
      return undefined;
    }

    try {
      // Create streaming chat completion
      return await this.openai!.chat.completions.create({
        model: this.model!,
        messages,
        max_tokens: config?.max_tokens ?? 8000,
        temperature: config?.temperature ?? 0.1,
        stream: true,
        stream_options: {
          include_usage: true,
        },
        ...config,
      });
    } catch (error) {
      logger.error(
        `Error creating OpenAI stream: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  /**
   * Creates a non-streaming chat completion
   * @param messages The messages to send to the API
   * @param config Additional configuration options
   * @returns A non-streaming response or undefined if service is unavailable
   */
  public async createCompletion(
    messages: Array<ChatCompletionMessageParam>,
    config?: Omit<ChatCompletionCreateParamsStreaming, 'model' | 'stream'>
  ) {
    // Check if service is available
    if (!this.isAvailable()) {
      logger.warn('OpenAI service unavailable for completion request');
      return undefined;
    }

    // Check rate limits
    const canProcess = await this.canLLMProcess();
    if (!canProcess) {
      logger.warn('Rate limits exceeded for OpenAI completion request');
      return undefined;
    }

    try {
      // Create non-streaming chat completion
      return await this.openai!.chat.completions.create({
        model: this.model!,
        messages,
        max_tokens: config?.max_tokens ?? 8000,
        temperature: config?.temperature ?? 0.1,
        ...config,
      });
    } catch (error) {
      logger.error(
        `Error creating OpenAI completion: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }
}
