import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenAIService } from './openai.service';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import logger from '@/utils/logger';

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

export abstract class BaseGenerativeService extends OpenAIService implements IGenerativeService {
  constructor(modelName?: string) {
    super(modelName);
  }

  //TODO : handle  methods update change model and api key when rate-limit for open api integrate
  //....................................................

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

    const stream = await this.createStream(messages);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
