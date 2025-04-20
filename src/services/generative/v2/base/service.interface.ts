import { ProcessingResult, FileMetadata } from '@/types/generate/generate.type';

/**
 * Base interface for all generative services
 */
export interface IGenerativeService {
  getModelName(): string;
  isAvailable(): Promise<boolean>;
}

/**
 * Interface for text generation services
 */
export interface ITextGenerationService extends IGenerativeService {
  generateContent(prompt: string, options?: GenerationOptions): Promise<string>;
  generateContentStream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown>;
}

/**
 * Interface for flashcard generation services
 */
export interface IFlashcardService {
  generateFlashcards(content: string): Promise<GenerationResult>;
}

/**
 * Interface for quiz generation services
 */
export interface IQuizService {
  generateQuizzes(content: string): Promise<GenerationResult>;
}

/**
 * Interface for file processing services
 */
export interface IFileProcessingService {
  startProcessing(file: Express.Multer.File): Promise<string>;
  getProcessingStatus(id: string): Promise<ProcessingResult>;
  getFileMetadata(file: Express.Multer.File): FileMetadata;
}

/**
 * Interface for PDF processing services
 */
export interface IPdfService {
  generateFlashcardsWithPDF(
    pdfPath: string,
    maxContentLength?: number
  ): Promise<PdfGenerationResult>;
}

/**
 * Common types used by services
 */
export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: 'text' | 'json_schema' | 'json_object';
}

export interface GenerationResult {
  items: any[];
  rawText: string;
}

export interface PdfGenerationResult {
  flashcards: any[];
  pageCount?: number;
  processedPages?: number;
}
