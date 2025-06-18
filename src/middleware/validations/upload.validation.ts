import { Express, Request, Response, NextFunction } from 'express';
import { BadRequest } from '@/core/error';
import * as path from 'path';

/**
 * Validation middleware for file upload operations
 */

/**
 * Validate file IDs in request body
 */
export const validateFileIds = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { fileIds } = req.body;

    if (!fileIds) {
      throw new BadRequest('fileIds is required');
    }

    if (!Array.isArray(fileIds)) {
      throw new BadRequest('fileIds must be an array');
    }

    if (fileIds.length === 0) {
      throw new BadRequest('fileIds array cannot be empty');
    }

    // Validate each file ID is a string
    for (let i = 0; i < fileIds.length; i++) {
      if (typeof fileIds[i] !== 'string' || fileIds[i].trim() === '') {
        throw new BadRequest(`Invalid file ID at index ${i}`);
      }
    }

    next();
  };
};

/**
 * Validate file ID parameter
 */
export const validateFileId = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { fileId } = req.params;

    if (!fileId || fileId.trim() === '') {
      throw new BadRequest('File ID is required');
    }

    next();
  };
};

/**
 * Validate move file request body
 */
export const validateMoveFileRequest = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { newDirectory } = req.body;

    if (!newDirectory || typeof newDirectory !== 'string' || newDirectory.trim() === '') {
      throw new BadRequest('newDirectory is required and must be a non-empty string');
    }

    // Basic path validation
    if (path.isAbsolute(newDirectory)) {
      throw new BadRequest('newDirectory must be a relative path for security reasons');
    }

    next();
  };
};

/**
 * Validate cleanup request body
 */
export const validateCleanupRequest = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { maxAgeInHours } = req.body;

    if (maxAgeInHours !== undefined) {
      if (typeof maxAgeInHours !== 'number' || maxAgeInHours <= 0) {
        throw new BadRequest('maxAgeInHours must be a positive number');
      }

      if (maxAgeInHours > 8760) {
        // 1 year
        throw new BadRequest('maxAgeInHours cannot exceed 8760 hours (1 year)');
      }
    }

    next();
  };
};

/**
 * Validate text encoding parameter
 */
export const validateTextEncoding = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { encoding } = req.query;

    if (encoding && typeof encoding === 'string') {
      const validEncodings = [
        'utf8',
        'ascii',
        'utf-8',
        'utf16le',
        'ucs2',
        'ucs-2',
        'base64',
        'latin1',
        'binary',
        'hex',
      ];

      if (!validEncodings.includes(encoding)) {
        throw new BadRequest(`Invalid encoding. Supported encodings: ${validEncodings.join(', ')}`);
      }
    }

    next();
  };
};

/**
 * Validate file upload limits
 */
export const validateUploadLimits = (
  maxFiles: number = 10,
  maxSizePerFile: number = 50 * 1024 * 1024
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[];

    if (files && Array.isArray(files)) {
      if (files.length > maxFiles) {
        throw new BadRequest(`Too many files. Maximum allowed: ${maxFiles}`);
      }

      for (const file of files) {
        if (file.size > maxSizePerFile) {
          throw new BadRequest(
            `File ${file.originalname} exceeds size limit of ${(maxSizePerFile / 1024 / 1024).toFixed(2)}MB`
          );
        }
      }
    }

    next();
  };
};

/**
 * Validate single file upload
 */
export const validateSingleFileUpload = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;

    if (!file) {
      throw new BadRequest('No file uploaded');
    }

    // Additional file validation can be added here
    if (file.size === 0) {
      throw new BadRequest('Uploaded file is empty');
    }

    next();
  };
};

/**
 * Validate multiple files upload
 */
export const validateMultipleFilesUpload = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[];

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequest('No files uploaded');
    }

    // Check for empty files
    for (const file of files) {
      if (file.size === 0) {
        throw new BadRequest(`File ${file.originalname} is empty`);
      }
    }

    next();
  };
};
