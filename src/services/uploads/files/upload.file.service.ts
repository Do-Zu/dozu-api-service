import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { generateConfig } from '@/config/generate.config';
import { BadRequest, InternalServerError } from '@/core/error';
import logger from '@/utils/logger';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { PresignedUrlRequest, PresignedUrlResponse } from '@/types/uploads/upload.types';
import { getSystemDate } from '@/utils/date';

/**
 * File upload configuration interface
 */
export interface FileUploadConfig {
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    uploadDir?: string;
    allowedExtensions?: string[];
}

/**
 * File upload result interface
 */
export interface FileUploadResult {
    id: string;
    originalName: string;
    fileName: string;
    filePath: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
    status: FileProcessingStatus;
}

/**
 * Multiple file upload result interface
 */
export interface MultipleFileUploadResult {
    successful: FileUploadResult[];
    failed: Array<{
        originalName: string;
        error: string;
    }>;
    totalFiles: number;
    successCount: number;
    failureCount: number;
}

/**
 * File validation result interface
 */
interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Comprehensive file upload service
 * Handles single and multiple file uploads with validation, storage, and management
 */
export class UploadFileService {
    private uploadedFiles = new Map<string, FileUploadResult>();

    private defaultConfig: FileUploadConfig;

    constructor(config?: Partial<FileUploadConfig>) {
        this.defaultConfig = {
            maxFileSize: config?.maxFileSize || generateConfig.maxFileSize,
            allowedMimeTypes: config?.allowedMimeTypes || [
                // Documents
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                // Text files
                'text/plain',
                'text/csv',
                'text/markdown',
                'application/json',
                'text/html',
                'text/xml',
                // Images
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/bmp',
                'image/webp',
                'image/svg+xml',
                // Archives
                'application/zip',
                'application/x-rar-compressed',
                'application/x-7z-compressed',
                'application/x-tar',
                'application/gzip',
            ],
            uploadDir: config?.uploadDir || generateConfig.uploadDir,
            allowedExtensions: config?.allowedExtensions || [
                '.pdf',
                '.doc',
                '.docx',
                '.txt',
                '.md',
                '.jpeg',
                '.png',
                '.jpg',
            ],
        };

        // Ensure upload directory exists
        this.ensureUploadDirectory();
    }

    /**
     * Ensure upload directory exists
     * @private
     */
    private ensureUploadDirectory(): void {
        try {
            if (!fs.existsSync(this.defaultConfig.uploadDir!)) {
                fs.mkdirSync(this.defaultConfig.uploadDir!, { recursive: true });
                logger.info(`Created upload directory: ${this.defaultConfig.uploadDir}`);
            }
        } catch (error) {
            logger.error(
                `Failed to create upload directory: ${error instanceof Error ? error.message : String(error)}`
            );
            throw new InternalServerError('Failed to initialize upload directory');
        }
    }

    /**
     * Validate file before upload
     * @param file - Multer file object
     * @param config - Optional custom configuration
     * @private
     */
    private validateFile(file: Express.Multer.File, config?: FileUploadConfig): FileValidationResult {
        const currentConfig = { ...this.defaultConfig, ...config };

        // Check file size
        if (file.size > currentConfig.maxFileSize!) {
            return {
                isValid: false,
                error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(currentConfig.maxFileSize! / 1024 / 1024).toFixed(2)}MB`,
            };
        }

        // Check MIME type
        if (currentConfig.allowedMimeTypes && !currentConfig.allowedMimeTypes.includes(file.mimetype)) {
            return {
                isValid: false,
                error: `File type ${file.mimetype} is not allowed. Allowed types: ${currentConfig.allowedMimeTypes.join(', ')}`,
            };
        }

        // Check file extension
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (currentConfig.allowedExtensions && !currentConfig.allowedExtensions.includes(fileExtension)) {
            return {
                isValid: false,
                error: `File extension ${fileExtension} is not allowed. Allowed extensions: ${currentConfig.allowedExtensions.join(', ')}`,
            };
        }

        return { isValid: true };
    }

    /**
     * Generate unique filename
     * @param originalName - Original filename
     * @private
     */
    private generateFileName(originalName: string): string {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        return `${uniqueSuffix}-${baseName}${extension}`;
    }

    /**
     * Get multer storage configuration
     * @param config - Optional custom configuration
     */
    public getMulterStorage(config?: FileUploadConfig): multer.StorageEngine {
        const currentConfig = { ...this.defaultConfig, ...config };

        return multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, currentConfig.uploadDir!);
            },
            filename: (req, file, cb) => {
                const fileName = this.generateFileName(file.originalname);
                cb(null, fileName);
            },
        });
    }

    /**
     * Get multer upload middleware for single file
     * @param fieldName - Form field name for the file
     * @param config - Optional custom configuration
     */
    public getSingleFileUploadMiddleware(fieldName: string = 'file', config?: FileUploadConfig) {
        const currentConfig = { ...this.defaultConfig, ...config };

        return multer({
            storage: this.getMulterStorage(currentConfig),
            limits: {
                fileSize: currentConfig.maxFileSize,
                files: 1,
            },
            fileFilter: (req, file, cb) => {
                const validation = this.validateFile(file, currentConfig);
                if (validation.isValid) {
                    cb(null, true);
                } else {
                    cb(new BadRequest(validation.error!));
                }
            },
        }).single(fieldName);
    }

    /**
     * Get multer upload middleware for multiple files
     * @param fieldName - Form field name for the files
     * @param maxCount - Maximum number of files
     * @param config - Optional custom configuration
     */
    public getMultipleFilesUploadMiddleware(
        fieldName: string = 'files',
        maxCount: number = 10,
        config?: FileUploadConfig
    ) {
        const currentConfig = { ...this.defaultConfig, ...config };

        return multer({
            storage: this.getMulterStorage(currentConfig),
            limits: {
                fileSize: currentConfig.maxFileSize,
                files: maxCount,
            },
            fileFilter: (req, file, cb) => {
                const validation = this.validateFile(file, currentConfig);
                if (validation.isValid) {
                    cb(null, true);
                } else {
                    cb(new BadRequest(validation.error!));
                }
            },
        }).array(fieldName, maxCount);
    }
    /**
     * Process single uploaded file
     * @param file - Multer file object
     * @param _userId - Optional user ID (unused but kept for future extension)
     */
    public async processSingleFile(file: Express.Multer.File, _userId?: string): Promise<FileUploadResult> {
        try {
            const fileId = uuidv4();

            const result: FileUploadResult = {
                id: fileId,
                originalName: file.originalname,
                fileName: file.filename,
                filePath: file.path,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: getSystemDate(),
                status: FileProcessingStatus.COMPLETED,
            };

            if (_userId) {
                console.warn(
                    'User ID is provided but not used in file processing. Consider implementing user-specific logic.'
                );
            }

            // Store file info in memory (in production, use database)
            //this.uploadedFiles.set(fileId, result);

            logger.info(`File uploaded successfully: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`);

            return result;
        } catch (error) {
            logger.error(`Error processing uploaded file: ${error instanceof Error ? error.message : String(error)}`);

            // Clean up file if processing failed
            if (file.path && fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (cleanupError) {
                    logger.warn(
                        `Failed to clean up file after processing error: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
                    );
                }
            }

            throw new InternalServerError('Failed to process uploaded file');
        }
    }
    /**
     * Process multiple uploaded files
     * @param files - Array of Multer file objects
     * @param _userId - Optional user ID (unused but kept for future extension)
     */
    public async processMultipleFiles(
        files: Express.Multer.File[],
        _userId?: string
    ): Promise<MultipleFileUploadResult> {
        const successful: FileUploadResult[] = [];
        const failed: Array<{ originalName: string; error: string }> = [];
        for (const file of files) {
            try {
                const result = await this.processSingleFile(file, _userId);
                successful.push(result);
            } catch (error) {
                failed.push({
                    originalName: file.originalname,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        const result: MultipleFileUploadResult = {
            successful,
            failed,
            totalFiles: files.length,
            successCount: successful.length,
            failureCount: failed.length,
        };

        logger.info(`Batch upload completed: ${result.successCount}/${result.totalFiles} files uploaded successfully`);

        return result;
    }

    /**
     * Get file information by ID
     * @param fileId - File ID
     */
    public getFileById(fileId: string): FileUploadResult | undefined {
        return this.uploadedFiles.get(fileId);
    }

    /**
     * Get all uploaded files
     */
    public getAllFiles(): FileUploadResult[] {
        return Array.from(this.uploadedFiles.values());
    }

    /**
     * Delete file by ID
     * @param fileId - File ID
     */
    public async deleteFile(fileId: string): Promise<boolean> {
        try {
            const fileInfo = this.uploadedFiles.get(fileId);
            if (!fileInfo) {
                return false;
            }

            // Delete physical file
            if (fs.existsSync(fileInfo.filePath)) {
                fs.unlinkSync(fileInfo.filePath);
                logger.info(`Deleted file: ${fileInfo.filePath}`);
            }

            // Remove from memory
            this.uploadedFiles.delete(fileId);

            return true;
        } catch (error) {
            logger.error(`Error deleting file ${fileId}: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Delete multiple files by IDs
     * @param fileIds - Array of file IDs
     */
    public async deleteMultipleFiles(fileIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
        const deleted: string[] = [];
        const failed: string[] = [];

        for (const fileId of fileIds) {
            const success = await this.deleteFile(fileId);
            if (success) {
                deleted.push(fileId);
            } else {
                failed.push(fileId);
            }
        }

        return { deleted, failed };
    }

    /**
     * Clean up old files based on age
     * @param maxAgeInHours - Maximum age in hours
     */
    public async cleanupOldFiles(maxAgeInHours: number = 24): Promise<number> {
        const cutoffTime = new Date(Date.now() - maxAgeInHours * 60 * 60 * 1000);
        let deletedCount = 0;

        for (const [fileId, fileInfo] of this.uploadedFiles.entries()) {
            if (fileInfo.uploadedAt < cutoffTime) {
                const success = await this.deleteFile(fileId);
                if (success) {
                    deletedCount++;
                }
            }
        }

        logger.info(`Cleaned up ${deletedCount} old files older than ${maxAgeInHours} hours`);
        return deletedCount;
    }

    /**
     * Get file content as buffer
     * @param fileId - File ID
     */
    public async getFileContent(fileId: string): Promise<Buffer | null> {
        try {
            const fileInfo = this.uploadedFiles.get(fileId);
            if (!fileInfo || !fs.existsSync(fileInfo.filePath)) {
                return null;
            }

            return fs.readFileSync(fileInfo.filePath);
        } catch (error) {
            logger.error(
                `Error reading file content ${fileId}: ${error instanceof Error ? error.message : String(error)}`
            );
            return null;
        }
    } /**
     * Get file content as string (for text files)
     * @param fileId - File ID
     * @param encoding - Text encoding
     */
    public async getFileContentAsString(
        fileId: string,
        encoding:
            | 'utf8'
            | 'ascii'
            | 'utf-8'
            | 'utf16le'
            | 'ucs2'
            | 'ucs-2'
            | 'base64'
            | 'latin1'
            | 'binary'
            | 'hex' = 'utf-8'
    ): Promise<string | null> {
        try {
            const buffer = await this.getFileContent(fileId);
            if (!buffer) {
                return null;
            }

            return buffer.toString(encoding);
        } catch (error) {
            logger.error(
                `Error reading file content as string ${fileId}: ${error instanceof Error ? error.message : String(error)}`
            );
            return null;
        }
    }

    /**
     * Generate presigned URL for file upload
     * @param request - Presigned URL request
     * @param expiresInMinutes - URL expiration time in minutes (default: 60)
     */
    public generatePresignedUrl(request: PresignedUrlRequest, expiresInMinutes: number): PresignedUrlResponse {
        try {
            // Validate request
            this.validatePresignedUrlRequest(request);

            const fileId = uuidv4();

            const expiresIn = expiresInMinutes * 60;

            // Store presigned URL info

            // Generate upload URL (in a real implementation, this would be a secure URL)
            const uploadUrl = `/upload/single`;

            const response: PresignedUrlResponse = {
                uploadUrl,
                fileId,
                fileKey: `${fileId}:${request.fileName}`,
                expiresIn,
                conditions: {
                    maxFileSize: this.defaultConfig.maxFileSize!,
                    allowedContentTypes: this.defaultConfig.allowedMimeTypes!,
                },
            };

            //   logger.info(
            //     `Generated presigned URL for file: ${request.fileName}, expires in ${expiresInMinutes} minutes`
            //   );

            return response;
        } catch (error) {
            logger.error(`Error generating presigned URL: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Validate presigned URL request
     * @param request - Presigned URL request
     * @private
     */
    private validatePresignedUrlRequest(request: PresignedUrlRequest): void {
        if (!request.fileName || request.fileName.trim() === '') {
            throw new BadRequest('fileName is required');
        }

        if (!request.fileSize || request.fileSize <= 0) {
            throw new BadRequest('fileSize must be a positive number');
        }

        if (!request.fileType || request.fileType.trim() === '') {
            throw new BadRequest('fileType is required');
        }

        if (!request.contentType || request.contentType.trim() === '') {
            throw new BadRequest('contentType is required');
        }

        // Validate file size
        if (request.fileSize > this.defaultConfig.maxFileSize!) {
            throw new BadRequest(
                `File size ${(request.fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(this.defaultConfig.maxFileSize! / 1024 / 1024).toFixed(2)}MB`
            );
        }

        // Validate content type
        if (this.defaultConfig.allowedMimeTypes && !this.defaultConfig.allowedMimeTypes.includes(request.contentType)) {
            throw new BadRequest(
                `Content type ${request.contentType} is not allowed. Allowed types: ${this.defaultConfig.allowedMimeTypes.join(', ')}`
            );
        }

        // Validate file extension
        const fileExtension = path.extname(request.fileName).toLowerCase();
        if (this.defaultConfig.allowedExtensions && !this.defaultConfig.allowedExtensions.includes(fileExtension)) {
            throw new BadRequest(
                `File extension ${fileExtension} is not allowed. Allowed extensions: ${this.defaultConfig.allowedExtensions.join(', ')}`
            );
        }
    }

    /**
     * Get presigned URL info by file ID
     * @param fileId - File ID
     */
    public getPresignedUrlInfo(
        fileId: string
    ): { request: PresignedUrlRequest; expiresAt: Date; used: boolean } | null {
        if (!fileId) {
            throw new BadRequest('File ID is required');
        }
        return null;
    }

    /**
     * Get all active presigned URLs
     */
    public getActivePresignedUrls(): Array<{
        fileId: string;
        fileName: string;
        expiresAt: Date;
        used: boolean;
    }> {
        const active: Array<{ fileId: string; fileName: string; expiresAt: Date; used: boolean }> = [];
        return active;
    }
}

// Export singleton instance
export const uploadFileService = new UploadFileService();
