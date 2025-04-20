import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import {
  ITextGenerationService,
  GenerationOptions,
} from '@/services/generative/v2/base/service.interface';
import { BaseGenerativeService } from '../base/base-service.abstract';
import { MODELS } from '@/constants/openapi';

/**
 * Service for interacting with the Google Studio API
 * Provides both standard and streaming generation options
 */
export class GoogleStudioService extends BaseGenerativeService implements ITextGenerationService {
  private ai: GoogleGenAI;
  private openai: OpenAI;
  private readonly API_KEY: string;
  private readonly BASE_URL: string = 'https://generativelanguage.googleapis.com/v1beta/';

  constructor(
    apiKey: string = process.env.GOOGLE_STUDIO_API_KEY || '',
    modelName: string = 'gemini-2.0-flash-lite'
  ) {
    super(modelName);
    this.API_KEY = apiKey;

    // Initialize both clients
    this.ai = new GoogleGenAI({ apiKey: this.API_KEY });
    this.openai = new OpenAI({
      apiKey: this.API_KEY,
      baseURL: this.BASE_URL,
    });
  }

  /**
   * Check if the service is available by validating API key
   */
  public async isAvailable(): Promise<boolean> {
    return Boolean(this.API_KEY);
  }

  /**
   * Generate content using standard approach
   */
  public async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    const model = options?.model || this.modelName;
    const cacheKey = this.generateCacheKey(prompt, options);

    const cachedResponse = this.getFromCache<string>(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: [
          {
            role: 'system',
            text: 'You are an expert at creating educational content from academic content.',
          },
          {
            role: 'user',
            text: prompt,
          },
        ],
        config: {
          maxOutputTokens: options?.maxTokens || 3000,
          temperature: options?.temperature || 0.5,
          stopSequences: ['\n'],
        },
      });

      const content = response?.candidates?.[0]?.content?.parts?.[0].text ?? '';

      if (!content) {
        throw new Error('No content generated from Google Studio API');
      }

      this.storeInCache(cacheKey, content);

      return content;
    } catch (error) {
      console.error('Error generating content with Google Studio:', error);
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

    // Map the model name to the right format if needed
    const mappedModel = model.replace('gemini-', 'gemini-');
    const chunks: string[] = [];

    try {
      const stream = await this.openai.chat.completions.create({
        model: mappedModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating educational content from academic content.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: options?.maxTokens || 8000,
        temperature: options?.temperature || 0.8,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          chunks.push(content); // Store chunks for caching
          yield content;
        }
      }

      // Store in cache after completion
      this.storeInCache(cacheKey, chunks);
    } catch (error) {
      console.error('Error streaming content with Google Studio:', error);
      throw error;
    }
  }

  /**
   * Get available models from the constants
   */
  public getAvailableModels(): string[] {
    return Object.keys(MODELS)
      .filter(key => key.includes('GOOGLE') || key.includes('gemini'))
      .map(key => MODELS[key].model);
  }
}

// Export singleton instance for use throughout the application
export const googleStudioService = new GoogleStudioService();
