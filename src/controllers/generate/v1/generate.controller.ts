import { Request, Response } from 'express';
import { generateService } from '@/services/generative/v1/generate.service';
import { BadRequest, InternalServerError } from '@/core/error';
import { FileUploadRequestInterface, MindmapGenerationResponseInterface } from '@/dtos/generate';
import { SuccessResponse } from '@/core/success';
import logger from '@/utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files, PDFs, and document files
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only text, PDF, and document files are allowed'));
    }
  },
});

class GenerateController {
  constructor() {}

  /**
   * Upload file and generate mindmap
   */
  public async uploadAndGenerateMindmap(req: Request, res: Response): Promise<void> {
    const file = req.file;

    if (!file) {
      throw new BadRequest('No file uploaded');
    }

    const { customPrompt, userId } = req.body;

    const request: FileUploadRequestInterface = {
      filePath: file.path,
      fileName: file.originalname,
      mimeType: file.mimetype,
      type: 'mindmap',
      customPrompt,
      userId,
    };

    logger.info(`Processing file upload for mindmap generation: ${file.originalname}`);

    // Process the file and generate mindmap
    const mindmapData = await generateService.processFileUploadForMindmap(request);

    if (!mindmapData) {
      throw new BadRequest('Failed to generate mindmap from uploaded file');
    }

    const response: MindmapGenerationResponseInterface = {
      jobId: `mindmap_${Date.now()}`,
      status: 'completed',
      message: 'Mindmap generated successfully',
      mindmapData,
      timestamp: new Date().toISOString(),
    };

    // Clean up uploaded file
    try {
      const normalizedPath = path.resolve(file.path);
      if (normalizedPath.startsWith(uploadDir)) {
        fs.unlinkSync(normalizedPath);
      } else {
        logger.warn(`Attempted to delete a file outside the upload directory: ${file.path}`);
      }
    } catch (error) {
      logger.warn(
        `Failed to clean up uploaded file: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    SuccessResponse.ok(res, response, 'Mindmap generated successfully');
  }

  /**
   * Generate mindmap from text content
   */
  public async generateMindmapFromText(req: Request, res: Response): Promise<void> {
    const { content, customPrompt } = req.body;
    const { userId } = req.currentUser;

    if (!content) {
      throw new BadRequest('Content is required');
    }

    const request: FileUploadRequestInterface = {
      content,
      type: 'mindmap',
      customPrompt,
      userId,
    };

    logger.info('Processing text content for mindmap generation');

    // Process the content and generate mindmap
    const mindmapData = await generateService.processFileUploadForMindmap(request);

    if (!mindmapData) {
      throw new InternalServerError('Failed to generate mindmap from text content');
    }

    SuccessResponse.ok(res, mindmapData, 'Mindmap generated successfully');
  }

  /**
   * Get processing status by job ID
   */
  public async getProcessingStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    if (!jobId) {
      throw new BadRequest('Job ID is required');
    }

    const result = generateService.getProcessingResult(jobId);

    if (!result) {
      throw new BadRequest('Processing result not found');
    }

    SuccessResponse.ok(res, result, 'Processing status retrieved');
  }

  /**
   * Get processing progress for large file operations
   */
  public async getFileProcessingProgress(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    if (!jobId) {
      throw new BadRequest('Job ID is required');
    }

    // Check if it's a large file processing job
    const progress = generateService.getFileProcessingProgress(jobId);

    if (!progress) {
      throw new BadRequest('Processing progress not found for this job ID');
    }

    SuccessResponse.ok(res, progress, 'Processing progress retrieved');
  }

  /**
   * Get multer upload middleware
   */
  public getUploadMiddleware() {
    return upload.single('file');
  }
}

export const generateController = new GenerateController();
