import OpenAI from 'openai';
import { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat';
import { generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { Stream } from 'openai/streaming';

export class OpenAIService {
  private openaiClient: OpenAI;
  private readonly API_KEY: string =
    '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';

  constructor() {
    this.openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.API_KEY,
    });
  }

  public async generateContentByApiIntegrateNonStream(
    content: string,
    type?: TYPE_PROMPT
  ): Promise<ChatCompletion> {
    const response = await this.openaiClient.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating educational from academic content.',
        },
        {
          role: 'user',
          content: generatePromptText(content, type),
        },
      ],
      temperature: 0.5,
      max_tokens: 8000,
      top_p: 0.7,
      response_format: {
        type: 'json_object',
      },
    });

    return response;
  }

  public async generateContentByApiIntegrateStream(
    content: string,
    type?: TYPE_PROMPT
  ): Promise<string> {
    const response: Stream<ChatCompletionChunk> = await this.openaiClient.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        {
          role: 'assistant',
          content: 'You are an expert at creating educational from academic content.',
        },
        {
          role: 'user',
          content: generatePromptText(content, type),
        },
      ],
      temperature: 0.5,
      max_tokens: 8000,
      top_p: 0.7,
      stream: true,
    });

    let output = '';

    for await (const chunk of response) {
      output += chunk?.choices?.[0]?.delta?.content;
    }

    return output;
  }
}
