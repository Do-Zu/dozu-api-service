import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenAIService } from '../provider/llm/openai.service';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import logger from '@/utils/logger';
import { GenerateContentRequestInterface, GenerateContentResponseInterface } from '@/dtos/generate';
import { AbstractBaseLLMService, LLMRequestOptions } from '../provider/base-llm.abstract';

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: 'text' | 'json_schema' | 'json_object';
}

export interface IGenerativeService {
  //   getNameModel: () => string;
  //   isAvailableModel: () => Promise<boolean>;
}

export interface ITextFormatGenerateService extends IGenerativeService {
  generateContent(prompt: string, options?: GenerationOptions): Promise<string>;
  generateContentStream(prompt: string, options?: GenerationOptions): Promise<unknown>;
}

export abstract class BaseGenerativeService implements IGenerativeService {
  private readonly openai: OpenAIService;

  constructor() {
    this.openai = new OpenAIService();
  }

  //TODO : handle  methods update change model and api key when rate-limit for open api integrate
  //....................................................

  /**
   * @description register generate content
   * @param content
   */
  public abstract registerGenerateContentByLLM(
    requestData: GenerateContentRequestInterface
  ): Promise<GenerateContentResponseInterface>;

  /**
   * @description generate content by LLM
   * @param content
   */
  protected abstract generateContentByLLMBackGround(content: string): Promise<unknown>;

  protected async updateStatusLLMRateLimit() {
    return await this.openai.canLLMProcess();
  }

  /**
   * @description create stream handler generate content from google studio by gemini
   * @param prompt
   */
  protected async *streamContentFromGoogleStudio(
    prompt: string
  ): AsyncGenerator<string, void, unknown> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at creating educational content from academic content.',
      },
      { role: 'user', content: prompt },
    ];

    const stream = await this.openai.createStream(messages);

    if (!stream) return;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
