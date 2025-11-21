import { OpenAIService } from '../llm/strategies/providers/openai/openai.service';
import { GenerateContentRequestInterface, GenerateContentResponseInterface } from '@/dtos/generate';

/**
 * Configuration options for content generation
 */
export interface GenerationOptions {
    /** The model to use for generation (defaults to service's configured model) */
    model?: string;
    /** Controls randomness: 0 is deterministic, higher values increase randomness */
    temperature?: number;
    /** Maximum number of tokens to generate */
    maxTokens?: number;
    /** Nucleus sampling parameter */
    topP?: number;
    /** Format for the response */
    responseFormat?: 'text' | 'json_schema' | 'json_object';
}

/**
 * Base interface for all generative services
 */
export interface IGenerativeService {
    // Reserved for common interface methods
    // getNameModel: () => string;
    // isAvailableModel: () => Promise<boolean>;
}

/**
 * Interface for text generation services
 */
export interface ITextFormatGenerateService extends IGenerativeService {
    /**
     * Generate content as a string
     * @param prompt The prompt to generate from
     * @param options Optional generation parameters
     * @returns The generated content
     */
    generateContent(prompt: string, options?: GenerationOptions): Promise<string>;

    /**
     * Generate content as a stream
     * @param prompt The prompt to generate from
     * @param options Optional generation parameters
     * @returns Stream of generated content
     */
    generateContentStream(prompt: string, options?: GenerationOptions): Promise<unknown>;
}

/**
 * Interface for file-based generation services
 */

/**
 * Abstract base class for all generative services
 * Provides common functionality for LLM integration, content generation,
 * and request processing.
 */
export abstract class BaseGenerativeService implements IGenerativeService {
    /** The LLM service provider */
    private llmProvider: OpenAIService;

    constructor() {
        this.llmProvider = new OpenAIService();
    }

    /**
     * Register a content generation request
     * This method initiates the generation process and returns a job identifier
     *
     * @param requestData The request data containing content to process
     * @returns Response with job tracking information
     */
    public abstract registerGenerateContentByLLM(
        requestData: GenerateContentRequestInterface
    ): Promise<GenerateContentResponseInterface>;

    /**
     * Process content generation in the background
     * This method handles the actual generation process once a job is started
     *
     * @param content The content to generate from
     * @returns The generated content in the appropriate format
     */
    protected abstract generateContentByLLMBackGround(content: string): Promise<unknown>;

    /**
     * Check and update LLM rate limiting status
     * This ensures we respect API limits and switch models if needed
     *
     * @returns True if the LLM can process requests, false if rate-limited
     */
    protected async updateStatusLLMRateLimit(): Promise<boolean> {
        return await this.llmProvider.canLLMProcess();
    }

    /**
     * Get the current LLM model identifier
     * @returns The model identifier string
     */
    protected getModel(): string | null {
        return this.llmProvider.getModel();
    }

    /**
     * Get the API key used for authentication
     * @returns The API key string
     */
    protected getApiKey(): string | null {
        return this.llmProvider.getApiKey();
    }

    /**
     * Get the base URL of the LLM provider
     * @returns The provider's base URL
     */
    protected getProviderBaseUrl(): string | null {
        return this.llmProvider.getProviderBaseUrl();
    }
    /**
     * Get the LLM provider instance
     * This allows access to provider-specific methods and properties
     *
     * @returns The OpenAIService instance
     */
    protected getLLMProvider(): OpenAIService {
        return this.llmProvider;
    }

    /**
     * Generate content with standard error handling and retries
     * This provides a robust wrapper around the stream generation process
     *
     * @param prompt The prompt to generate from
     * @param options Optional generation parameters
     * @param maxRetries Maximum number of retries on failure
     * @returns The complete generated content
     */
    protected async generateWithRetries(
        prompt: string,
        options?: GenerationOptions,
        maxRetries: number = 2
    ): Promise<string> {
        let retries = 0;
        let fullContent = '';

        while (retries <= maxRetries) {
            try {
                // Generate content using stream
                for await (const chunk of this.llmProvider.handleProcessStreamContent(prompt)) {
                    fullContent += chunk;
                }

                // If we got content, return it
                if (fullContent) {
                    return fullContent;
                }

                // Otherwise, retry
                retries++;
            } catch {
                retries++;
                // Wait before retrying (exponential backoff)
                if (retries <= maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
                }
            }
        }

        // Return what we have, even if incomplete
        return fullContent;
    }
}
