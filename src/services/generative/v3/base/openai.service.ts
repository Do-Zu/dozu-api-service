import OpenAI from 'openai';
import { APIPromise } from 'openai/core';
import {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import { Stream } from 'openai/streaming';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_API_KEY_GOOGLE_TEST = 'AIzaSyD9Gl54LCI8ZFJlPtv855p0bldtJRvZtTE';
const DEFAULT_BASE_URL_OPENAI = 'https://generativelanguage.googleapis.com/v1beta/openai/';

export class OpenAIService {
  private apiKey: string;
  protected modelName: string;
  private baseURL: string;
  private openai: OpenAI;

  constructor(modelName?: string) {
    //TODO: get API key available from DB
    this.modelName = DEFAULT_MODEL;
    this.apiKey = DEFAULT_API_KEY_GOOGLE_TEST;
    this.baseURL = DEFAULT_BASE_URL_OPENAI;
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
    });

    // Initialize API key asynchronously
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.apiKey = await this.getApiKey();
    } catch (error) {
      console.error(`Error initializing API key: ${error}`);
    }
  }

  getNameModel() {
    return this.modelName;
  }

  async isAvailableModel(): Promise<boolean> {
    // Check if the model is available for use
    // This could be expanded to make an actual API call to verify model availability
    try {
      // For now, assume the model is available if we have an API key and model name
      return !!(this.apiKey && this.modelName);
    } catch (error) {
      console.error(`Error checking model availability: ${error}`);
      return false;
    }
  }

  private async getApiKey(): Promise<string> {
    //TODO: get API key available for model select from DB
    // In a real implementation, this might fetch from a secure storage or refresh if needed
    return DEFAULT_API_KEY_GOOGLE_TEST;
  }

  //TODO: implement get model doesn't rate limit
  protected async getModelAvailable(model: string | undefined): Promise<string> {
    if (!this.isModelAvailable(model)) return DEFAULT_MODEL;

    return DEFAULT_MODEL;
  }

  protected async isModelAvailable(model: string | undefined) {
    if (model === undefined) return false;
    //TODO: implement get model available
    return true;
  }

  public getOpenAI(): OpenAI {
    return this.openai;
  }

  public async createStream(
    messages: Array<ChatCompletionMessageParam>,
    config?: Omit<ChatCompletionCreateParamsStreaming, 'model'>
  ) {
    return await this.openai.chat.completions.create({
      model: this.modelName,
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
