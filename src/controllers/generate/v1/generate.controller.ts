import { Request, Response } from 'express';
import { generateService } from '@/services/generative/v1/generate.service';
import { SuccessResponse } from '@/core/success';
import multer from 'multer';
import path from 'node:path';
import fs from 'fs';
import { BadRequest } from '@/core/error';

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
