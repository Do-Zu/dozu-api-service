import OpenAI from 'openai';
import { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat';
import { Stream } from 'openai/streaming';
import {
  ITextGenerationService,
  GenerationOptions,
} from '@/services/generative/v2/base/service.interface';
import { BaseGenerativeService } from '../base/base-service.abstract';
import { MODELS } from '@/constants/openapi';

/**
 * Service for interacting with the OpenAI API via OpenRouter
 * Provides both standard and streaming generation options
 */
export class OpenAIService extends BaseGenerativeService implements ITextGenerationService {
  private openaiClient: OpenAI;
  private readonly DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
  private readonly DEFAULT_FORMAT_RESPONSE = 'json_object';
  private readonly DEFAULT_MAX_TOKENS = 8000;
  private readonly DEFAULT_TEMPERATURE = 0.8;

  constructor(
    apiKey: string = process.env.OPENAI_API_KEY ||
      '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',
    modelName: string = 'meta-llama/llama-3.3-70b-instruct:free',
    baseUrl: string = 'https://openrouter.ai/api/v1'
  ) {
    super(modelName);

    this.openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });
  }

  /**
   * Check if the service is available by validating cached state
   */
  public async isAvailable(): Promise<boolean> {
    try {
      // Simple check to see if the client is properly initialized
      return !!this.openaiClient;
    } catch (error) {
      console.error('Error checking OpenAI service availability:', error);
      return false;
    }
  }

  /**
   * Generate content using standard approach
   */
  public async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    const model = options?.model || this.modelName;
    const cacheKey = this.generateCacheKey(prompt, options);

    // Try to get from cache first
    const cachedResponse = this.getFromCache<string>(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating educational content from academic content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.temperature || this.DEFAULT_TEMPERATURE,
        max_tokens: options?.maxTokens || this.DEFAULT_MAX_TOKENS,
        response_format: {
          type: this.DEFAULT_FORMAT_RESPONSE,
        },
      });

      const content = response.choices[0]?.message?.content || '';

      // Store in cache for future use
      this.storeInCache(cacheKey, content);

      return content;
    } catch (error) {
      console.error('Error generating content with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Generate content using streaming approach for better performance
   * with large responses
   */
  public async *generateContentStream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || this.modelName;
    const cacheKey = this.generateCacheKey(prompt, options);

    // Try to get from cache first
    const cachedChunks = this.getFromCache<string[]>(cacheKey);
    if (cachedChunks) {
      for (const chunk of cachedChunks) {
        yield chunk;
      }
      return;
    }

    const chunks: string[] = [];

    try {
      const stream: Stream<ChatCompletionChunk> = await this.openaiClient.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating educational content from academic content.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.temperature || this.DEFAULT_TEMPERATURE,
        max_tokens: options?.maxTokens || this.DEFAULT_MAX_TOKENS,
        stream: true,
        response_format: {
          type: this.DEFAULT_FORMAT_RESPONSE,
        },
      });

      for await (const chunk of stream) {
        const content = chunk?.choices?.[0]?.delta?.content;
        if (content) {
          chunks.push(content);
          yield content;
        }
      }

      this.storeInCache(cacheKey, chunks);
    } catch (error) {
      console.error('Error streaming content with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Get available models from the constants
   */
  public getAvailableModels(): string[] {
    return Object.keys(MODELS)
      .filter(key => !key.includes('GOOGLE') && !key.includes('gemini'))
      .map(key => MODELS[key].model);
  }
}

// Export singleton instance for use throughout the application
export const openAIService = new OpenAIService();
