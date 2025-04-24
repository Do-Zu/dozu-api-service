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

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_API_KEY_GOOGLE_TEST = process.env.GOOGLE_STUDIO_API_KEY;
const DEFAULT_BASE_URL_OPENAI = 'https://generativelanguage.googleapis.com/v1beta/openai/';

export abstract class AbstractBaseLLMService {
  protected apiKey: string | undefined;
  protected model: string | undefined;
  protected baseURL: string | undefined;

  constructor() {}

  protected abstract generateContent(option?: LLMRequestOptions): Promise<unknown>;

  protected async initialize(
    model: string | undefined,
    apiKey: string | undefined,
    baseURL: string | undefined
  ): Promise<void> {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
  }

  protected async canLLMProcess(): Promise<boolean> {
    // Check if the model is available for use and API KEY non expired today
    // This could be expanded to make an actual API call to verify model availability
    try {
      // For now, assume the model is available if we have an API key and model name
      return !!(this.apiKey && this.model);
    } catch (error) {
      console.error(`Error checking model availability: ${error}`);
      return false;
    }
  }

  protected async getApiKey(): Promise<string | undefined> {
    //TODO: get API key available for model select from DB
    // In a real implementation, this might fetch from a secure storage or refresh if needed
    return DEFAULT_API_KEY_GOOGLE_TEST;
  }

  //TODO: implement get model doesn't rate limit
  protected async getModelAvailable(): Promise<string> {
    if (!this.isModelAvailable(this.model)) return DEFAULT_MODEL; //TODO: get model default when model not available

    return DEFAULT_MODEL;
  }

  protected async isModelAvailable(model: string | undefined) {
    if (model === undefined) return false;
    //TODO: implement check model available for user or rate limit
    return true;
  }

  protected async getBaseURL(): Promise<string | undefined> {
    return DEFAULT_BASE_URL_OPENAI;
  }
}
