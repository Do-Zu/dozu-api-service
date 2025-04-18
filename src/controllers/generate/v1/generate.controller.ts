import { Request, Response } from 'express';
import { generateService } from '@/services/generative/v1/generate.service';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';

export class GenerateController {
  constructor() {}

  async handleFileUpload(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      throw new BadRequest('No file uploaded');
    }

    const processingId = await generateService.startProcessing(file);

    // Return immediately with an ID for status tracking
    res.status(202).json({
      message: 'File upload received and processing started',
      processingId,
      status: FileProcessingStatus.PROCESSING,
    });
  }

  async getProcessingStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const status = await generateService.getProcessingStatus(id);
    res.status(200).json(status);
  }

  async handleGenerateFlashCardLLM(req: Request, res: Response): Promise<void> {
    const { content } = req.body;

    if (!content) {
      throw new BadRequest('No content provided for flashcard generation');
    }

    const result = await generateService.generateFlashcardsLLM(content);

    SuccessResponse.ok(
      res,
      {
        flashcards: result.items,
        text: result.rawText,
      },
      'Flashcards generated successfully'
    );
  }

  async handleGenerateFlashCardAlgo(req: Request, res: Response): Promise<void> {
    const { content } = req.body;

    if (!content) {
      throw new BadRequest('No content provided for flashcard generation');
    }

    const result = await generateService.generateFlashcardsAlgo(content);

    SuccessResponse.ok(
      res,
      {
        flashcards: result.items,
        text: result.rawText,
      },
      'Flashcards generated successfully'
    );
  }

  async handleGenerateContentPdf(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new BadRequest('No content provided for flashcard generation');
    }

    const pdfFilePath = req.file.path;

    const result = await generateService.generateFlashcardsWithPDF(pdfFilePath);

    SuccessResponse.ok(res, result, 'Flashcards generated successfully');
  }

  async handleGenerateQuizzesLLM(req: Request, res: Response): Promise<void> {
    const { content } = req.body;

    if (!content) {
      throw new BadRequest('No content provided for quiz generation');
    }

    const result = await generateService.generateQuizzesLLM(content);

    SuccessResponse.ok(
      res,
      {
        quizzes: result.items,
        text: result.rawText,
      },
      'Quizzes generated successfully'
    );
  }
}
