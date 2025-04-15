import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import { generateConfig } from '@/config/generate.config';

// Ensure upload directory exists
import * as fs from 'fs';

if (!fs.existsSync(generateConfig.uploadDir)) {
  fs.mkdirSync(generateConfig.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, generateConfig.uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// Configure multer for handling large files
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: generateConfig.maxFileSize, // 50MB in bytes
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation if needed
    cb(null, true);
  },
});

export const errorHandlerMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `File size exceeds the ${generateConfig.maxFileSize / 1024 / 1024}MB limit`,
      });
    }
  }
  next(err);
};
