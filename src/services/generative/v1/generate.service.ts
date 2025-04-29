import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  FileMetadata,
  ProcessingResult,
  FileProcessingStatus,
} from '@/types/generate/generate.type';
import { generateConfig } from '@/config/generate.config';
import { convertJsonToArray, generatePromptText } from '@/utils/prompt';
import * as fsPromise from 'fs/promises';
import pdfParse from 'pdf-parse';
import { generateFlashcards } from '../provider/generate.algorithm.service';
import { streamContentFromGoogleStudio } from '../provider/googlestudio.service';

import { OpenAIService } from '../provider/openai.service';

const processingJobs = new Map<string, ProcessingResult>();

class GenerateService {
  private openAiService: OpenAIService;

  constructor() {
    this.openAiService = new OpenAIService();
  }

  async startProcessing(file: Express.Multer.File): Promise<string> {
    const processingId = uuidv4();
    const metadata = this.getFileMetadata(file);

    processingJobs.set(processingId, {
      id: processingId,
      status: FileProcessingStatus.PROCESSING,
      metadata,
      startTime: Date.now(),
    });

    return processingId;
  }

  async getProcessingStatus(id: string): Promise<ProcessingResult> {
    const status = processingJobs.get(id);
    if (!status) {
      throw new Error(`No processing job found with id ${id}`);
    }
    return status;
  }

  private async processFileAsync(filePath: string, processingId: string): Promise<void> {
    const job = processingJobs.get(processingId);
    let totalProcessed = 0;

    try {
      // const readStream = fs.createReadStream(filePath);
      // const processingStream = new Transform({
      //   transform(chunk, encoding, callback) {
      //     try {
      //       // Process each chunk of data
      //       totalProcessed += chunk.length;
      //       // Example transformation - in real world, implement your business logic here
      //       this.push(chunk);
      //       callback();
      //     } catch (error) {
      //       callback(error);
      //     }
      //   },
      // });

      const outputPath = path.join(
        generateConfig.uploadDir,
        `processed-${path.basename(filePath)}`
      );
      const writeStream = fs.createWriteStream(outputPath);

      //await pipelineAsync(readStream, processingStream, writeStream);

      // Update job status to completed
      // processingJobs.set(processingId, {
      //   ...job,
      //   status: FileProcessingStatus.COMPLETED,
      //   resultPath: outputPath,
      //   processedBytes: totalProcessed,
      //   endTime: Date.now(),
      // });
    } catch (error) {
      throw error;
    }
  }

  getFileMetadata(file: Express.Multer.File): FileMetadata {
    return {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      path: file.path,
      uploadedAt: new Date(),
    };
  }

  /**
   * @description Generates quizzes using the OpenAI API LLM
   * @param content The content to generate quizzes from
   * @returns
   */
  public async generateQuizzesLLM(content: string): Promise<any> {
    return await this.generateQuizzesLLMStream(content);
  }

  /**
   *
   * @description Generates quizzes using the OpenAI API LLM streaming method
   * @param content The content to generate quizzes from
   * @returns list quizzes
   */
  private async generateQuizzesLLMStream(content: string): Promise<any> {
    const prompt = generatePromptText(content, 'MULTIPLE_CHOICE');

    let fullContent = '';
    for await (const chunk of streamContentFromGoogleStudio(prompt)) {
      fullContent += chunk;
    }

    const data = convertJsonToArray(fullContent || '[]');

    return {
      quizzes: data,
      text: fullContent,
    };
  }

  /**
   *
   * @description Generates flashcards using the OpenAI API non-streaming method
   * @param content The content to generate flashcards from
   * @returns list flashcards
   */
  public async generateFlashcardsLLM(content: string): Promise<any> {
    return await this.generateFlashcardsLLMStream(content);
  }

  /**
   * @description Generates flashcards using the OpenAI API streaming method
   * @param content The content to generate flashcards from
   * @returns list flashcards
   */
  private async generateFlashcardsLLMStream(content: string): Promise<any> {
    const prompt = generatePromptText(content, 'FLASH_CARD');

    let fullContent = '';

    for await (const chunk of streamContentFromGoogleStudio(prompt)) {
      fullContent += chunk;
    }

    const data = convertJsonToArray(fullContent || '[]');

    return {
      quizzes: data,
      text: fullContent,
    };
  }

  /**
   * @param content The content to generate flashcards from
   * @returns list flashcards
   * @description Generates flashcards using the algorithm service
   */
  public async generateFlashcardsAlgo(content: string): Promise<any> {
    const flashcards = generateFlashcards(content);
    return Promise.resolve(flashcards);
  }

  /**
   * Generates flashcards from a PDF file
   * @param pdfPath Path to the PDF file
   * @param maxContentLength Optional maximum content length to process (to avoid token limits)
   * @returns Object containing the generated flashcards array
   */
  async generateFlashcardsWithPDF(
    pdfPath: string,
    maxContentLength = 10000
  ): Promise<{
    flashcards: any[];
    pageCount?: number;
    processedPages?: number;
  }> {
    // Load and parse the PDF file
    const pdfBuffer = await fsPromise.readFile(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);

    //Get PDF metadata
    const { numpages, text } = pdfData;

    // TODO: Truncate content if it's too large to avoid token limits

    // Call the AI model with the extracted text
    const response = await this.generateFlashcardsLLM(text);

    const dataResponse = response?.choices[0]?.message?.content;
    const flashcards = convertJsonToArray(dataResponse || '[]');

    return {
      flashcards,
      pageCount: numpages,
      processedPages:
        text.length > maxContentLength
          ? Math.ceil((maxContentLength / text.length) * numpages)
          : numpages,
    };
  }
}

export const generateService = new GenerateService();
