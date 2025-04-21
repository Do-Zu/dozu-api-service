import { FileMetadata, ProcessingResult } from '@/types/generate/generate.type';
import {
  GenerationResult,
  PdfGenerationResult,
} from '@/services/generative/v2/base/service.interface';
import { contentGenerationService } from './content-generation.service';
import { fileProcessingService } from './file-processing.service';
import { generateFlashcards } from '../provider/generate.algorithm.service';

/**
 * Main service for content generation operations
 * Coordinates between specialized services using composition pattern
 */
export class GenerateService {
  constructor() {}

  /**
   * Start processing an uploaded file
   * Returns a job ID for status tracking
   */
  async startProcessing(file: Express.Multer.File): Promise<string> {
    return await fileProcessingService.startProcessing(file);
  }

  /**
   * Check the status of a processing job
   */
  async getProcessingStatus(id: string): Promise<ProcessingResult> {
    return await fileProcessingService.getProcessingStatus(id);
  }

  /**
   * Extract metadata from an uploaded file
   */
  getFileMetadata(file: Express.Multer.File): FileMetadata {
    return fileProcessingService.getFileMetadata(file);
  }

  /**
   * Generate quizzes using LLM
   * Handles large content with chunking
   */
  public async generateQuizzesLLM(content: string): Promise<GenerationResult> {
    const maxChunkSize = 4000; // TODO: Optimal chunk size for processing

    if (content.length > maxChunkSize) {
      // For large content, use chunking
      return await contentGenerationService.processLargeContent(content, 'quizzes', maxChunkSize);
    } else {
      // For smaller content, process directly
      return await contentGenerationService.generateQuizzes(content);
    }
  }

  /**
   * Generate flashcards using LLM
   * Handles large content with chunking
   */
  public async generateFlashcardsLLM(content: string): Promise<GenerationResult> {
    const maxChunkSize = 4000; //TODO: Optimal chunk size for processing

    if (content.length > maxChunkSize) {
      // For large content, use chunking
      return await contentGenerationService.processLargeContent(
        content,
        'flashcards',
        maxChunkSize
      );
    } else {
      // For smaller content, process directly
      return await contentGenerationService.generateFlashcards(content);
    }
  }

  /**
   * Generate flashcards using algorithm (non-LLM)
   */
  public async generateFlashcardsAlgo(content: string): Promise<any> {
    const flashcards = generateFlashcards(content);
    return {
      items: flashcards,
      rawText: JSON.stringify(flashcards),
    };
  }

  /**
   * Generate flashcards from PDF file
   */
  async generateFlashcardsWithPDF(
    pdfPath: string,
    maxContentLength = 10000
  ): Promise<PdfGenerationResult> {
    return await fileProcessingService.generateFlashcardsWithPDF(pdfPath, maxContentLength);
  }
}

export const generateService = new GenerateService();
