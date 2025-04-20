import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as fsPromise from 'fs/promises';
import pdfParse from 'pdf-parse';
import {
  IFileProcessingService,
  IPdfService,
  PdfGenerationResult,
} from '@/services/generative/v2/base/service.interface';
import {
  FileMetadata,
  ProcessingResult,
  FileProcessingStatus,
} from '@/types/generate/generate.type';
import { contentGenerationService } from './content-generation.service';
import { generateConfig } from '@/config/generate.config';

/**
 * Service for processing file uploads and PDF content extraction
 */
export class FileProcessingService implements IFileProcessingService, IPdfService {
  // Store processing jobs in memory (could be moved to Redis for production)
  private processingJobs = new Map<string, ProcessingResult>();

  constructor() {}

  /**
   * Start asynchronous processing of an uploaded file
   * Returns a job ID that can be used to check the status
   */
  public async startProcessing(file: Express.Multer.File): Promise<string> {
    const processingId = uuidv4();
    const metadata = this.getFileMetadata(file);

    // Create initial job status
    this.processingJobs.set(processingId, {
      id: processingId,
      status: FileProcessingStatus.PROCESSING,
      metadata,
      startTime: Date.now(),
    });

    // Process in background to avoid blocking
    this.processFileAsync(file.path, processingId).catch(error => {
      console.error(`Error processing file ${file.originalname}:`, error);
      this.processingJobs.set(processingId, {
        ...this.processingJobs.get(processingId)!,
        status: FileProcessingStatus.FAILED,
        error: error.message,
        endTime: Date.now(),
      });
    });

    return processingId;
  }

  /**
   * Check the status of a processing job
   */
  public async getProcessingStatus(id: string): Promise<ProcessingResult> {
    const status = this.processingJobs.get(id);
    if (!status) {
      throw new Error(`No processing job found with id ${id}`);
    }
    return status;
  }

  /**
   * Get metadata from an uploaded file
   */
  public getFileMetadata(file: Express.Multer.File): FileMetadata {
    return {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      path: file.path,
      uploadedAt: new Date(),
    };
  }

  /**
   * Process a file asynchronously
   * Updates the job status when complete
   */
  private async processFileAsync(filePath: string, processingId: string): Promise<void> {
    const job = this.processingJobs.get(processingId);
    if (!job) {
      throw new Error(`No job found with id ${processingId}`);
    }

    try {
      // Based on file type, process differently
      if (job.metadata.mimeType === 'application/pdf') {
        const result = await this.generateFlashcardsWithPDF(filePath);

        // Update job with results
        this.processingJobs.set(processingId, {
          ...job,
          status: FileProcessingStatus.COMPLETED,
          endTime: Date.now(),
        });
      } else {
        throw new Error(`Unsupported file type: ${job.metadata.mimeType}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate flashcards from a PDF file
   */
  public async generateFlashcardsWithPDF(
    pdfPath: string,
    maxContentLength = 10000
  ): Promise<PdfGenerationResult> {
    try {
      // Load and parse the PDF file
      const pdfBuffer = await fsPromise.readFile(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);

      // Get PDF metadata
      const { numpages, text } = pdfData;

      // Process the extracted text with content chunking for large documents
      const result = await contentGenerationService.processLargeContent(
        text,
        'flashcards',
        maxContentLength
      );

      return {
        flashcards: result.items,
        pageCount: numpages,
        processedPages:
          text.length > maxContentLength
            ? Math.ceil((maxContentLength / text.length) * numpages)
            : numpages,
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw error;
    }
  }
}

export const fileProcessingService = new FileProcessingService();
