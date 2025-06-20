import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import { BaseLLMProvider } from '../../../core/baseLLM.abstract';
import logger from '@/utils/logger';
import { GenerationOptions } from '@/services/generative/v3/base/base.abstract';
import { APIPromise } from 'openai/core';
import { MindmapData } from '@/models/mindmap/mindmap.model';
import { MindmapGenerateService } from '../../../../mindmap.generate.service';
import { ProcessingProgress } from '@/types/generate/large-file.type';

/**
 * Implements AbstractBaseLLMService for OpenAI API
 * Handles connection to OpenAI, streaming, and client management
 */
export class OpenAIService extends BaseLLMProvider {
  private openai: OpenAI | undefined;
  private isClientInitialized = false;
  private mindmapService: MindmapGenerateService | undefined;

  constructor() {
    super();
    this.initialize();
  }
  /**
   * Initializes the OpenAI client if API key and base URL are available
   * @returns true if initialization was successful, false otherwise
   */
  protected override async initialize(): Promise<boolean> {
    try {
      // Initialize base service first to load provider configuration
      await this.initialBase();

      // Check for required configuration
      if (!this.validateConfig()) {
        return false;
      }

      // Create OpenAI client with configuration
      this.openai = new OpenAI({
        apiKey: this.apiKey!,
        baseURL: this.baseURL!,
      });

      // Initialize mindmap service
      if (this.openai && this.model) {
        this.mindmapService = new MindmapGenerateService(this.openai, this.model);
      }

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

  public override async generate(
    prompt: string,
    options?: GenerationOptions
  ): Promise<APIPromise<ChatCompletion> | undefined> {
    return await this.createCompletion(prompt, options);
  }

  /**
   * Creates a streaming chat completion
   * @param messages The messages to send to the API
   * @param config Additional configuration options
   * @returns A streaming response or undefined if service is unavailable
   */
  private async createStream(
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
  private async createCompletion(
    prompt: string,
    config?: GenerationOptions,
    messages?: Array<ChatCompletionMessageParam>
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

    if (!messages) {
      messages = [
        {
          role: 'system',
          content: 'You are an expert at creating educational content from academic content.',
        },
        { role: 'user', content: prompt },
      ];
    }

    try {
      // Create non-streaming chat completion
      return await this.openai!.chat.completions.create({
        model: this.model!,
        messages,
        max_tokens: config?.maxTokens ?? 8000,
        temperature: config?.temperature ?? 0.1,
        top_p: config?.topP,
      });
    } catch (error) {
      logger.error(
        `Error creating OpenAI completion: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  /**
   * Create a generator for streaming content from Google Studio through OpenAI
   * This provides a standardized way to handle streaming generation
   *
   * @param prompt The prompt to generate from
   * @yields Chunks of generated content
   */ public async *handleProcessStreamContent(
    prompt: string
  ): AsyncGenerator<string, void, unknown> {
    // Configure generation context
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at creating educational content from academic content.',
      },
      { role: 'user', content: prompt },
    ];

    // Create streaming response
    const stream = await this.createStream(messages);

    if (!stream) return;

    // Yield content chunks as they arrive
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Generate mindmap from file content using OpenAI API
   * Delegates to the dedicated MindmapGenerateService
   * @param filePath Path to the uploaded file
   * @param fileName Original file name
   * @param customPrompt Optional custom prompt to override default
   * @returns Mindmap data structure
   */
  public async generateMindmapFromFile(
    filePath: string,
    fileName: string,
    customPrompt?: string
  ): Promise<MindmapData | null> {
    if (!this.isAvailable()) {
      logger.warn('OpenAI service unavailable for mindmap generation');
      return null;
    }

    if (!this.mindmapService) {
      logger.error('Mindmap service not initialized');
      return null;
    }

    return await this.mindmapService.generateMindmapFromFile(filePath, fileName, customPrompt);
  }
  /**
   * Get progress for mindmap processing job
   */
  public getProgress(jobId: string): ProcessingProgress | undefined {
    return this.mindmapService?.getProgress(jobId);
  }
}
