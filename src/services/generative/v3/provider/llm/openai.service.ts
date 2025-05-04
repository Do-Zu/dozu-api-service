import OpenAI from 'openai';
import {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import { AbstractBaseLLMService, LLMRequestOptions } from '../base-llm.abstract';
import logger from '@/utils/logger';

// const DEFAULT_MODEL = 'gemini-2.0-flash';
// const DEFAULT_API_KEY_GOOGLE_TEST = 'AIzaSyD9Gl54LCI8ZFJlPtv855p0bldtJRvZtTE';

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
      if (!this.apiKey) {
        logger.warn('Missing API key for OpenAI initialization');
        return false;
      }

      if (!this.baseURL) {
        logger.warn('Missing base URL for OpenAI initialization');
        return false;
      }

      this.openai = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL,
      });

      this.isClientInitialized = true;
      // logger.info('OpenAI client initialized successfully');
      return true;
    } catch (error) {
      logger.error(
        `Failed to initialize OpenAI client: ${error instanceof Error ? error.message : String(error)}`
      );
      this.isClientInitialized = false;
      return false;
    }
  }

  /**
   * Check if the service is ready to handle requests
   */
  public isAvailable(): boolean {
    return this.isClientInitialized && this.openai instanceof OpenAI;
  }

  public getOpenAI(): OpenAI | undefined {
    return this.openai;
  }

  public async createStream(
    messages: Array<ChatCompletionMessageParam>,
    config?: Omit<ChatCompletionCreateParamsStreaming, 'model'>
  ) {
    if (!this.isAvailable()) return undefined;
    // GET model/api-key doesn't rate limit available for user

    return await this.openai!.chat.completions.create({
      model: this.model!,
      ...config,
      messages,
      max_tokens: 8000,
      temperature: 0.1,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });
  }
}
