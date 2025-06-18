import { Express } from 'express';
import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest, InternalServerError } from '@/core/error';
import { uploadFileService, FileUploadConfig } from '@/services/uploads/files/upload.file.service';
import logger from '@/utils/logger';

/**
 * Upload File Controller
 * Handles file upload operations using the UploadFileService
 */
class UploadFileController {
  constructor() {}

  /**
   * Upload single file
   * POST /api/upload/single
   */
  public async uploadSingleFile(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequest('No file uploaded');
      }

      // Process the uploaded file
      const result = await uploadFileService.processSingleFile(file);

      logger.info(`Single file uploaded successfully: ${result.originalName}`);

      SuccessResponse.created(res, result, 'File uploaded successfully');
    } catch (error) {
      logger.error(
        `Error uploading single file: ${error instanceof Error ? error.message : String(error)}`
      );

      // Clean up file if processing failed
      if (req.file?.path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          logger.warn(
            `Failed to clean up file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
          );
        }
      }

      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to upload file');
      }
    }
  }

  /**
   * Upload multiple files
   * POST /api/upload/multiple
   */
  public async uploadMultipleFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new BadRequest('No files uploaded');
      }

      // Process the uploaded files
      const result = await uploadFileService.processMultipleFiles(files);

      logger.info(
        `Multiple files upload completed: ${result.successCount}/${result.totalFiles} successful`
      );

      SuccessResponse.created(res, result, `${result.successCount} files uploaded successfully`);
    } catch (error) {
      logger.error(
        `Error uploading multiple files: ${error instanceof Error ? error.message : String(error)}`
      );

      // Clean up files if processing failed
      if (req.files && Array.isArray(req.files)) {
        const fs = require('fs');

        req.files.forEach((file: Express.Multer.File) => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (cleanupError) {
            logger.warn(
              `Failed to clean up file ${file.originalname}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
            );
          }
        });
      }

      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to upload files');
      }
    }
  }

  /**
   * Get file information by ID
   * GET /api/upload/:fileId
   */
  public async getFileInfo(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        throw new BadRequest('File ID is required');
      }

      const fileInfo = uploadFileService.getFileById(fileId);
      if (!fileInfo) {
        throw new BadRequest('File not found');
      }

      SuccessResponse.ok(res, fileInfo, 'File information retrieved successfully');
    } catch (error) {
      logger.error(
        `Error getting file info: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to get file information');
      }
    }
  }

  /**
   * Get all files
   * GET /api/upload
   */
  public async getAllFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = uploadFileService.getAllFiles();
      const stats = uploadFileService.getUploadStats();

      SuccessResponse.ok(
        res,
        {
          files,
          statistics: stats,
        },
        'Files retrieved successfully'
      );
    } catch (error) {
      logger.error(
        `Error getting all files: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new InternalServerError('Failed to get files');
    }
  }

  /**
   * Download file content
   * GET /api/upload/:fileId/download
   */
  public async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        throw new BadRequest('File ID is required');
      }

      const fileInfo = uploadFileService.getFileById(fileId);
      if (!fileInfo) {
        throw new BadRequest('File not found');
      }

      const fileContent = await uploadFileService.getFileContent(fileId);
      if (!fileContent) {
        throw new BadRequest('File content not found');
      }

      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', fileContent.length);

      res.send(fileContent);
    } catch (error) {
      logger.error(
        `Error downloading file: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to download file');
      }
    }
  }

  /**
   * Get file content as text
   * GET /api/upload/:fileId/text
   */
  public async getFileAsText(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { encoding } = req.query;

      if (!fileId) {
        throw new BadRequest('File ID is required');
      }

      const fileInfo = uploadFileService.getFileById(fileId);
      if (!fileInfo) {
        throw new BadRequest('File not found');
      }

      // Check if file is likely to be text-based
      const textMimeTypes = [
        'text/plain',
        'text/csv',
        'text/markdown',
        'application/json',
        'text/html',
        'text/xml',
      ];

      if (!textMimeTypes.includes(fileInfo.mimeType)) {
        throw new BadRequest('File is not a text file');
      }

      const textContent = await uploadFileService.getFileContentAsString(
        fileId,
        (encoding as any) || 'utf-8'
      );

      if (!textContent) {
        throw new BadRequest('Unable to read file as text');
      }

      SuccessResponse.ok(
        res,
        {
          fileId,
          originalName: fileInfo.originalName,
          content: textContent,
          encoding: encoding || 'utf-8',
        },
        'File content retrieved as text'
      );
    } catch (error) {
      logger.error(
        `Error getting file as text: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to get file as text');
      }
    }
  }

  /**
   * Delete file by ID
   * DELETE /api/upload/:fileId
   */
  public async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        throw new BadRequest('File ID is required');
      }

      const success = await uploadFileService.deleteFile(fileId);
      if (!success) {
        throw new BadRequest('File not found or could not be deleted');
      }

      SuccessResponse.ok(res, { fileId }, 'File deleted successfully');
    } catch (error) {
      logger.error(
        `Error deleting file: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to delete file');
      }
    }
  }

  /**
   * Delete multiple files
   * DELETE /api/upload/batch
   */
  public async deleteMultipleFiles(req: Request, res: Response): Promise<void> {
    try {
      const { fileIds } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        throw new BadRequest('File IDs array is required');
      }

      const result = await uploadFileService.deleteMultipleFiles(fileIds);

      SuccessResponse.ok(res, result, `${result.deleted.length} files deleted successfully`);
    } catch (error) {
      logger.error(
        `Error deleting multiple files: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to delete files');
      }
    }
  }

  /**
   * Clean up old files
   * POST /api/upload/cleanup
   */
  public async cleanupOldFiles(req: Request, res: Response): Promise<void> {
    try {
      const { maxAgeInHours } = req.body;
      const age = maxAgeInHours || 24; // Default to 24 hours

      const deletedCount = await uploadFileService.cleanupOldFiles(age);

      SuccessResponse.ok(
        res,
        {
          deletedCount,
          maxAgeInHours: age,
        },
        `Cleaned up ${deletedCount} old files`
      );
    } catch (error) {
      logger.error(
        `Error cleaning up old files: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new InternalServerError('Failed to cleanup old files');
    }
  }

  /**
   * Move file to different directory
   * PUT /api/upload/:fileId/move
   */
  public async moveFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { newDirectory } = req.body;

      if (!fileId) {
        throw new BadRequest('File ID is required');
      }

      if (!newDirectory) {
        throw new BadRequest('New directory is required');
      }

      const success = await uploadFileService.moveFile(fileId, newDirectory);
      if (!success) {
        throw new BadRequest('File not found or could not be moved');
      }

      const updatedFileInfo = uploadFileService.getFileById(fileId);

      SuccessResponse.ok(res, updatedFileInfo, 'File moved successfully');
    } catch (error) {
      logger.error(`Error moving file: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof BadRequest) {
        throw error;
      } else {
        throw new InternalServerError('Failed to move file');
      }
    }
  }

  /**
   * Get upload statistics
   * GET /api/upload/stats
   */
  public async getUploadStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = uploadFileService.getUploadStats();

      SuccessResponse.ok(res, stats, 'Upload statistics retrieved successfully');
    } catch (error) {
      logger.error(
        `Error getting upload stats: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new InternalServerError('Failed to get upload statistics');
    }
  }

  /**
   * Get single file upload middleware
   */
  public getSingleUploadMiddleware(fieldName: string = 'file', config?: FileUploadConfig) {
    return uploadFileService.getSingleFileUploadMiddleware(fieldName, config);
  }

  /**
   * Get multiple files upload middleware
   */
  public getMultipleUploadMiddleware(
    fieldName: string = 'files',
    maxCount: number = 10,
    config?: FileUploadConfig
  ) {
    return uploadFileService.getMultipleFilesUploadMiddleware(fieldName, maxCount, config);
  }
}

export const uploadFileController = new UploadFileController();
export default UploadFileController;
