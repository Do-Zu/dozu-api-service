import { Request, Response } from 'express';
import { GenerateService } from '@/services/generate.service';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';

export class GenerateController {
  private generateService: GenerateService;

  constructor() {
    this.generateService = new GenerateService();
  }

  async handleFileUpload(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      throw new BadRequest('No file uploaded');
    }

    const processingId = await this.generateService.startProcessing(file);

    // Return immediately with an ID for status tracking
    res.status(202).json({
      message: 'File upload received and processing started',
      processingId,
      status: FileProcessingStatus.PROCESSING,
    });
  }

  async getProcessingStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const status = await this.generateService.getProcessingStatus(id);
    res.status(200).json(status);
  }

  async handleGenerateContent(req: Request, res: Response): Promise<void> {
    const { content } = req.body;

    if (!content) {
      throw new BadRequest('No content provided for flashcard generation');
    }

    const flashcards = await this.generateService.generateFlashcards(content);

    SuccessResponse.ok(res, flashcards, 'Flashcards generated successfully');
  }

  async handleGenerateContentPdf(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new BadRequest('No content provided for flashcard generation');
    }

    const pdfFilePath = req.file.path;

    const flashcards = await this.generateService.generateFlashcardsWithPDF(pdfFilePath);

    SuccessResponse.ok(res, flashcards, 'Flashcards generated successfully');
  }
}
