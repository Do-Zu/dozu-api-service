import { Express } from 'express';
import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest, InternalServerError } from '@/core/error';
import { uploadFileService, FileUploadConfig } from '@/services/uploads/files/upload.file.service';
import { PresignedUrlRequest, PresignedUrlResponse } from '@/types/uploads/upload.types';
import logger from '@/utils/logger';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { TypeInsertInputSet } from '@/models';
import { insertInputSet } from '@/repositories/inputSet.repo';
import { uploadFileServiceOnR2 } from '@/services/uploads/files/upload.file.R2.service';

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

            //implement inputset - DuyND
            //change to function
            let resultInputSet;
            if (req.currentUser) {
                const userId = getUserIdFromRequest(req);
                //only saves if userId is present (user is logged in)
                const newInputSet: TypeInsertInputSet = {
                    userId: userId,
                    title: file.originalname,
                    contentType: file.mimetype,
                    metadata: file.path, //!add size, page count
                };
                resultInputSet = await insertInputSet(newInputSet);
            }

            logger.info(`Single file uploaded successfully: ${result.originalName}`);

            SuccessResponse.created(
                res,
                { ...result, setId: resultInputSet ? resultInputSet.setId : undefined },
                'File uploaded successfully'
            );
        } catch (error) {
            logger.error(`Error uploading single file: ${error instanceof Error ? error.message : String(error)}`);

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

            logger.info(`Multiple files upload completed: ${result.successCount}/${result.totalFiles} successful`);

            SuccessResponse.created(res, result, `${result.successCount} files uploaded successfully`);
        } catch (error) {
            logger.error(`Error uploading multiple files: ${error instanceof Error ? error.message : String(error)}`);

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
            logger.error(`Error getting file info: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof BadRequest) {
                throw error;
            } else {
                throw new InternalServerError('Failed to get file information');
            }
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
            logger.error(`Error downloading file: ${error instanceof Error ? error.message : String(error)}`);
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

            const textContent = await uploadFileService.getFileContentAsString(fileId, (encoding as any) || 'utf-8');

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
            logger.error(`Error getting file as text: ${error instanceof Error ? error.message : String(error)}`);
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
            logger.error(`Error deleting file: ${error instanceof Error ? error.message : String(error)}`);
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
            logger.error(`Error deleting multiple files: ${error instanceof Error ? error.message : String(error)}`);
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
            logger.error(`Error cleaning up old files: ${error instanceof Error ? error.message : String(error)}`);
            throw new InternalServerError('Failed to cleanup old files');
        }
    }

    /**
     * Get upload statistics
     * GET /api/upload/stats
     */
    public async getUploadStats(req: Request, res: Response): Promise<void> {
        try {
            //   const stats = uploadFileService.getUploadStats();

            SuccessResponse.ok(res, {}, 'Upload statistics retrieved successfully');
        } catch (error) {
            logger.error(`Error getting upload stats: ${error instanceof Error ? error.message : String(error)}`);
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
    public getMultipleUploadMiddleware(fieldName: string = 'files', maxCount: number = 10, config?: FileUploadConfig) {
        return uploadFileService.getMultipleFilesUploadMiddleware(fieldName, maxCount, config);
    }

    /**
     * Generate presigned URL for file upload
     * POST /api/upload/presigned-url
     */
    public async generatePresignedUrl(req: Request, res: Response): Promise<void> {
        try {
            const { fileName, fileSize, fileType, contentType } = req.body as PresignedUrlRequest;

            if (req.method !== 'POST') {
                throw new BadRequest('Invalid request method');
            }

            if (!fileName || !fileSize || !fileType || !contentType) {
                throw new BadRequest('fileName, fileSize, fileType, and contentType are required');
            }

            const request: PresignedUrlRequest = {
                fileName,
                fileSize,
                fileType,
                contentType,
            };

            const result: PresignedUrlResponse =
                await uploadFileServiceOnR2.generatePresignedUrlWithR2Cloudflare(request);

            SuccessResponse.created(res, result, 'Presigned URL generated successfully');
        } catch (error) {
            logger.error(`Error generating presigned URL: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof BadRequest) {
                throw error;
            } else {
                throw new InternalServerError('Failed to generate presigned URL');
            }
        }
    }

    /**
     * Upload file using presigned URL
     * POST /api/upload/presigned/:fileId
     */
    public async uploadWithPresignedUrl(req: Request, res: Response): Promise<void> {
        try {
            const { fileId } = req.params;
            const file = req.file;

            if (!fileId) {
                throw new BadRequest('File ID is required');
            }

            if (!file) {
                throw new BadRequest('No file uploaded');
            }

            // Process the uploaded file
            const result = await uploadFileService.processSingleFile(file);

            // Update the file with the original file ID from presigned URL
            result.id = fileId;

            logger.info(`File uploaded successfully using presigned URL: ${file.originalname}`);

            SuccessResponse.created(res, result, 'File uploaded successfully');
        } catch (error) {
            logger.error(
                `Error uploading with presigned URL: ${error instanceof Error ? error.message : String(error)}`
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
     * Get presigned URL information
     * GET /api/upload/presigned/:fileId/info
     */
    public async getPresignedUrlInfo(req: Request, res: Response): Promise<void> {
        try {
            const { fileId } = req.params;

            if (!fileId) {
                throw new BadRequest('File ID is required');
            }

            const info = uploadFileService.getPresignedUrlInfo(fileId);
            if (!info) {
                throw new BadRequest('Presigned URL not found');
            }

            SuccessResponse.ok(
                res,
                {
                    fileId,
                    fileName: info.request.fileName,
                    fileSize: info.request.fileSize,
                    contentType: info.request.contentType,
                    expiresAt: info.expiresAt,
                    used: info.used,
                    isExpired: new Date() > info.expiresAt,
                },
                'Presigned URL information retrieved'
            );
        } catch (error) {
            logger.error(`Error getting presigned URL info: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof BadRequest) {
                throw error;
            } else {
                throw new InternalServerError('Failed to get presigned URL information');
            }
        }
    }

    /**
     * Get all active presigned URLs
     * GET /api/upload/presigned/active
     */
    public async getActivePresignedUrls(req: Request, res: Response): Promise<void> {
        try {
            const activeUrls = uploadFileService.getActivePresignedUrls();

            SuccessResponse.ok(
                res,
                {
                    presignedUrls: activeUrls,
                    count: activeUrls.length,
                },
                'Active presigned URLs retrieved'
            );
        } catch (error) {
            logger.error(
                `Error getting active presigned URLs: ${error instanceof Error ? error.message : String(error)}`
            );
            throw new InternalServerError('Failed to get active presigned URLs');
        }
    }

    /**
     * Clean up expired presigned URLs
     * POST /api/upload/presigned/cleanup
     */
    public async cleanupExpiredPresignedUrls(req: Request, res: Response): Promise<void> {
        try {
            const cleanedCount = uploadFileService.cleanupExpiredPresignedUrls();

            SuccessResponse.ok(
                res,
                {
                    cleanedCount,
                },
                `Cleaned up ${cleanedCount} expired presigned URLs`
            );
        } catch (error) {
            logger.error(
                `Error cleaning up expired presigned URLs: ${error instanceof Error ? error.message : String(error)}`
            );
            throw new InternalServerError('Failed to cleanup expired presigned URLs');
        }
    }

    /**
     * Get file from R2 Cloudflare storage
     * GET /api/upload/r2/:fileKey
     */
    public async getFileFromR2(req: Request, res: Response): Promise<void> {
        try {
            const { fileKey } = req.params;

            if (!fileKey) {
                throw new BadRequest('File key is required');
            }

            // Decode the file key in case it was URL encoded
            const decodedFileKey = decodeURIComponent(fileKey);

            const fileResult = await uploadFileServiceOnR2.getFileFromR2Cloudflare(decodedFileKey);

            // Set appropriate headers for file response
            res.setHeader('Content-Type', fileResult.contentType);
            res.setHeader('Content-Length', fileResult.size);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

            // Extract filename for content disposition
            const filename = fileResult.fileName;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            res.send(fileResult.content);
        } catch (error) {
            logger.error(`Error getting file from R2: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof BadRequest) {
                throw error;
            } else {
                throw new InternalServerError('Failed to retrieve file from R2 storage');
            }
        }
    }

    /**
     * Download file from R2 Cloudflare storage
     * GET /api/upload/r2/:fileKey/download
     */
    public async downloadFileFromR2(req: Request, res: Response): Promise<void> {
        try {
            const { fileKey } = req.params;

            if (!fileKey) {
                throw new BadRequest('File key is required');
            }

            // Decode the file key in case it was URL encoded
            const decodedFileKey = decodeURIComponent(fileKey);

            const fileResult = await uploadFileServiceOnR2.getFileFromR2Cloudflare(decodedFileKey);

            // Set appropriate headers for file download
            res.setHeader('Content-Type', fileResult.contentType);
            res.setHeader('Content-Length', fileResult.size);
            res.setHeader('Content-Disposition', `attachment; filename="${fileResult.fileName}"`);

            logger.info(`File downloaded from R2: ${fileResult.fileName} (${(fileResult.size / 1024).toFixed(2)}KB)`);

            res.send(fileResult.content);
        } catch (error) {
            logger.error(`Error downloading file from R2: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof BadRequest) {
                throw error;
            } else {
                throw new InternalServerError('Failed to download file from R2 storage');
            }
        }
    }

    /**
     * Generate download presigned URL for R2 file
     * GET /api/upload/r2/:fileKey/presigned-download
     */
    public async generateR2DownloadUrl(req: Request, res: Response): Promise<void> {
        try {
            const { fileKey } = req.params;
            const { expiresInMinutes } = req.query;

            if (!fileKey) {
                throw new BadRequest('File key is required');
            }

            const decodedFileKey = decodeURIComponent(fileKey);

            const defaultExpireFile = 1440;

            const expiration = expiresInMinutes ? parseInt(expiresInMinutes as string) : defaultExpireFile;

            if (expiration < 1 || expiration > 1440) {
                // Max 24 hours
                throw new BadRequest('Expiration must be between 1 and 1440 minutes');
            }

            const result = await uploadFileServiceOnR2.generateDownloadPresignedUrl(decodedFileKey, expiration);

            SuccessResponse.ok(res, result, 'Download URL generated successfully');
        } catch (error) {
            logger.error(`Error generating R2 download URL: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof BadRequest) {
                throw error;
            } else {
                throw new InternalServerError('Failed to generate download URL');
            }
        }
    }
}

export const uploadFileController = new UploadFileController();
