import * as fs from 'fs';
import * as path from 'path';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import {
  FileMetadata,
  ProcessingResult,
  FileProcessingStatus,
} from '@/types/generate/generate.type';
import { generateConfig } from '@/config/generate.config';
import OpenAI from 'openai';
import { extractAndNormalizeJson, generatePromptText } from '@/utils/prompt';
import { MODELS } from '@/constants/openapi';
import * as fsPromise from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';

const pipelineAsync = promisify(pipeline);
const processingJobs = new Map<string, ProcessingResult>();

export class GenerateService {
  private openaiClient: OpenAI;
  private readonly API_KEY: string =
    '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';

  constructor() {
    this.openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.API_KEY,
    });
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

    // Start async processing
    // this.processFileAsync(file.path, processingId).catch(error => {
    //   processingJobs.set(processingId, {
    //     id: processingId,
    //     status: FileProcessingStatus.FAILED,
    //     error: error.message,
    //     metadata,
    //     startTime: processingJobs.get(processingId).startTime,
    //     endTime: Date.now(),
    //   });
    // });

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

  async generateFlashcards(content: string): Promise<any> {
    const response = await this.openaiClient.chat.completions.create({
      model: 'google/gemini-2.5-pro-exp-03-25:free',
      messages: [
        {
          role: 'user',
          content: generatePromptText(content),
        },
      ],
      response_format: {
        type: 'json_object',
      },
    });

    // Parse the response to extract the flashcards
    const dataResponse = response?.choices[0]?.message?.content;
    const flashcards = extractAndNormalizeJson(dataResponse || '[]');

    return { flashcards };
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

    // // Truncate content if it's too large to avoid token limits
    // const contentForProcessing = text.substring(0, maxContentLength);

    // // Log information about the PDF
    // console.log(`Processing PDF with ${numpages} pages, extracted ${text.length} characters`);
    // if (text.length > maxContentLength) {
    //   console.log(`Content truncated to ${maxContentLength} characters due to token limits`);
    // }

    // Call the AI model with the extracted text
    const response = await this.openaiClient.chat.completions.create({
      model: 'qwen/qwen-2.5-7b-instruct:free',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating educational from academic content.',
        },
        {
          role: 'user',
          content: generatePromptText(text),
        },
      ],
      response_format: {
        type: 'json_object',
      },
    });

    const dataResponse = response?.choices[0]?.message?.content;
    const flashcards = extractAndNormalizeJson(dataResponse || '[]');

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
