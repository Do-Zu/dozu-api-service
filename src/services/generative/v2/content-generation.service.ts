import {
  IFlashcardService,
  IQuizService,
  ITextGenerationService,
  GenerationResult,
} from '@/services/generative/v2/base/service.interface';
import { googleStudioService } from './provider/googlestudio.service';
import { openAIService } from './provider/openai.service';
import { generatePromptText, convertJsonToArray } from '@/utils/prompt';
import NodeCache from 'node-cache';

/**
 * Service responsible for generating educational content
 * using the provided text generation services
 */
export class ContentGenerationService implements IFlashcardService, IQuizService {
  private cache: NodeCache;
  private primaryService: ITextGenerationService;
  private fallbackService: ITextGenerationService;

  constructor(
    primaryService: ITextGenerationService = googleStudioService,
    fallbackService: ITextGenerationService = openAIService,
    cacheTTL: number = 3600
  ) {
    this.primaryService = primaryService;
    this.fallbackService = fallbackService;
    this.cache = new NodeCache({ stdTTL: cacheTTL });
  }

  /**
   * Generate flashcards from content
   * Uses streaming for better performance with large content
   */
  public async generateFlashcards(content: string): Promise<GenerationResult> {
    const cacheKey = `flashcards:${content.substring(0, 50)}`;

    // Try to get from cache first
    const cachedResult = this.cache.get<GenerationResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const prompt = generatePromptText(content, 'FLASH_CARD');
    return await this.generateWithFallback(prompt, cacheKey);
  }

  /**
   * Generate quizzes from content
   * Uses streaming for better performance with large content
   */
  public async generateQuizzes(content: string): Promise<GenerationResult> {
    const cacheKey = `quizzes:${content.substring(0, 50)}`;

    // Try to get from cache first
    const cachedResult = this.cache.get<GenerationResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const prompt = generatePromptText(content, 'MULTIPLE_CHOICE');
    return await this.generateWithFallback(prompt, cacheKey);
  }

  /**
   * Generate content with fallback mechanism
   * If primary service fails, tries the fallback service
   */
  private async generateWithFallback(prompt: string, cacheKey: string): Promise<GenerationResult> {
    try {
      // Try with primary service first (typically Google)
      if (await this.primaryService.isAvailable()) {
        return await this.generateAndParseContent(this.primaryService, prompt, cacheKey);
      }
    } catch (error) {
      console.error(`Primary service error: ${error}`);
    }

    // If primary service failed or unavailable, try fallback (typically OpenAI)
    try {
      if (await this.fallbackService.isAvailable()) {
        return await this.generateAndParseContent(this.fallbackService, prompt, cacheKey);
      }
    } catch (fallbackError) {
      console.error(`Fallback service error: ${fallbackError}`);
      throw new Error('Failed to generate content with all available services');
    }

    throw new Error('No text generation services are available');
  }

  /**
   * Generate content using the provided service and parse the result
   */
  private async generateAndParseContent(
    service: ITextGenerationService,
    prompt: string,
    cacheKey: string
  ): Promise<GenerationResult> {
    // Attempt to get a complete response by streaming
    let fullContent = '';
    try {
      for await (const chunk of service.generateContentStream(prompt)) {
        fullContent += chunk;
      }
    } catch (error) {
      console.error(`Error streaming content: ${error}`);
      // Fallback to non-streaming if streaming fails
      fullContent = await service.generateContent(prompt);
    }

    // Parse the JSON from the response
    const items = convertJsonToArray(fullContent || '[]');

    const result = {
      items,
      rawText: fullContent,
    };

    // Store in cache for future use
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Break content into smaller chunks for processing
   * Helps with large token inputs
   */
  public breakContentIntoChunks(content: string, maxChunkSize: number = 4000): string[] {
    const chunks: string[] = [];

    // Try to break at paragraph boundaries
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Process large content by breaking into chunks
   * Handles content that would otherwise exceed token limits
   */
  public async processLargeContent(
    content: string,
    generationMethod: 'quizzes' | 'flashcards',
    maxChunkSize: number = 4000
  ): Promise<GenerationResult> {
    // If content is small enough, process directly
    if (content.length <= maxChunkSize) {
      return generationMethod === 'quizzes'
        ? await this.generateQuizzes(content)
        : await this.generateFlashcards(content);
    }

    // Otherwise, break into chunks and process each
    const chunks = this.breakContentIntoChunks(content, maxChunkSize);
    let allItems: any[] = [];
    let allRawText = '';

    for (const chunk of chunks) {
      const result =
        generationMethod === 'quizzes'
          ? await this.generateQuizzes(chunk)
          : await this.generateFlashcards(chunk);

      allItems = [...allItems, ...result.items];
      allRawText += result.rawText;
    }

    return {
      items: allItems,
      rawText: allRawText,
    };
  }
}

// Export singleton instance for use throughout the application
export const contentGenerationService = new ContentGenerationService();
