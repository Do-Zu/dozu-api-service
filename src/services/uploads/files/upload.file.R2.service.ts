import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateConfig } from '@/config/generate.config';
import { BadRequest, DatabaseError, InternalServerError } from '@/core/error';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { PresignedUrlRequest, PresignedUrlResponse } from '@/types/uploads/upload.types';
import { getSystemDate } from '@/utils/date';
import logger from '@/utils/logger';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { insertInputSet } from '@/repositories/inputSet.repo';
import { CONTENT_TYPE_INPUT_SET } from '@/types/inputSet/inputSet.type';
import { ALLOWED_MEDIA_EXT, ALLOWED_MEDIA_MIME_TYPES } from '@/utils/file/file.constant';

/**
 * Default allowed MIME types for file uploads
 */
const DEFAULT_ALLOWED_MIME_TYPES = [
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
].concat(ALLOWED_MEDIA_MIME_TYPES);

/**
 * Default allowed file extensions
 */
const DEFAULT_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.jpeg', '.png', '.jpg'].concat(
    ALLOWED_MEDIA_EXT
);

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
 * File download result interface
 */
export interface FileDownloadResult {
    fileId: string;
    fileName: string;
    content: Buffer;
    contentType: string;
    size: number;
    lastModified?: Date;
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
 * Comprehensive file upload service
 * Handles single and multiple file uploads with validation, storage, and management
 */
export class UploadFileService {
    private defaultConfig: FileUploadConfig;

    private ACCOUNT_ID: string;
    private BUCKET_NAME: string;
    private ACCESSKEY_ID: string;
    private SECRET_ACCESS_KEY: string;
    private END_POINT: string;
    private REGION: string = 'auto'; // Default region, can be changed if needed
    private R2Client: S3Client;

    constructor(config?: Partial<FileUploadConfig>) {
        this.ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
        this.BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
        this.ACCESSKEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
        this.SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
        this.END_POINT = `https://${this.ACCOUNT_ID}.r2.cloudflarestorage.com`;

        this.defaultConfig = {
            maxFileSize: config?.maxFileSize || generateConfig.maxFileSize,
            allowedMimeTypes: config?.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES,
            uploadDir: config?.uploadDir || generateConfig.uploadDir,
            allowedExtensions: config?.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS,
        };

        this.R2Client = new S3Client({
            region: this.REGION,
            endpoint: this.END_POINT,
            credentials: {
                accessKeyId: this.ACCESSKEY_ID,
                secretAccessKey: this.SECRET_ACCESS_KEY,
            },
        });
    }

    /**
     * Process single uploaded file
     * @param file - file
     * @param userId - User ID
     */
    public async processSingleFile({
        file,
        userId,
    }: {
        file: FileUploadResult;
        userId: string;
    }): Promise<FileUploadResult> {
        try {
            const fileId = uuidv4();

            const result: FileUploadResult = {
                id: fileId,
                originalName: file.originalName,
                fileName: file.fileName,
                filePath: file.filePath,
                size: file.size,
                mimeType: file.mimeType,
                uploadedAt: getSystemDate(),
                status: FileProcessingStatus.COMPLETED,
            };

            if (userId) {
                logger.warn(
                    'User ID is provided but not used in file processing. Consider implementing user-specific logic.'
                );
            }

            // TODO: Store file info in memory (in production, use database)

            logger.info(`File uploaded successfully: ${file.originalName} (${(file.size / 1024).toFixed(2)}KB)`);

            return result;
        } catch (error) {
            logger.error(`Error processing uploaded file: ${error instanceof Error ? error.message : String(error)}`);
            throw new InternalServerError('Failed to process uploaded file');
        }
    }

    /**
     * Generate presigned URL for file upload
     * @param request - Presigned URL request
     * @param expiresInMinutes - URL expiration time in minutes (default: 60)
     */
    public async generatePresignedUrlWithR2Cloudflare(
        request: PresignedUrlRequest,
        expiresInMinutes = 5
    ): Promise<PresignedUrlResponse> {
        // Validate request
        this.validatePresignedUrlRequest(request);

        const { fileName, fileType } = request;

        const fileId = uuidv4();
        const expiresIn = expiresInMinutes * 60;

        try {
            const fileKey = `${fileId}:${fileName}`;

            const command = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileKey,
                ContentType: fileType,
            });

            const presignedUrl = await getSignedUrl(this.R2Client, command, {
                expiresIn,
            });

            const response: PresignedUrlResponse = {
                uploadUrl: presignedUrl,
                fileId,
                fileKey,
                expiresIn,
                conditions: {
                    maxFileSize: this.defaultConfig.maxFileSize!,
                    allowedContentTypes: this.defaultConfig.allowedMimeTypes!,
                },
            };

            return response;
        } catch (error) {
            logger.error(`Error generating presigned URL: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Get file from R2 Cloudflare storage
     * @param fileKey - The file key in R2 storage
     */
    public async getFileFromR2Cloudflare(fileKey: string): Promise<FileDownloadResult> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileKey,
            });

            const response = await this.R2Client.send(command);

            if (!response.Body) {
                throw new InternalServerError('File content not found');
            }

            // Convert the response body to buffer
            const streamToBuffer = async (stream: unknown): Promise<Buffer> => {
                const chunks: Buffer[] = [];

                // Check if it has transformToByteArray method (AWS SDK v3)
                if (stream && typeof stream === 'object' && 'transformToByteArray' in stream) {
                    const transformMethod = (stream as { transformToByteArray: () => Promise<Uint8Array> })
                        .transformToByteArray;
                    const byteArray = await transformMethod();
                    return Buffer.from(byteArray);
                }

                // Handle as readable stream
                const readableStream = stream as Readable;
                return new Promise((resolve, reject) => {
                    readableStream.on('data', (chunk: Buffer) => chunks.push(chunk));
                    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
                    readableStream.on('error', reject);
                });
            };

            const content = await streamToBuffer(response.Body);

            // Extract file ID and name from the key (assuming format: fileId:fileName)
            const [fileId, fileName] = fileKey.includes(':') ? fileKey.split(':', 2) : [fileKey, fileKey];

            const result: FileDownloadResult = {
                fileId,
                fileName,
                content,
                contentType: response.ContentType || 'application/octet-stream',
                size: content.length,
                lastModified: response.LastModified,
            };

            logger.info(`File retrieved successfully from R2: ${fileName} (${(content.length / 1024).toFixed(2)}KB)`);

            return result;
        } catch (error) {
            logger.error(`Error retrieving file from R2: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof InternalServerError) {
                throw error;
            }
            throw new InternalServerError('Failed to retrieve file from R2 storage');
        }
    }

    /**
     * Generate presigned URL for file download
     * @param fileKey - The file key in R2 storage
     * @param expiresInMinutes - URL expiration time in minutes (default: 60)
     */
    public async generateDownloadPresignedUrl(
        fileKey: string,
        expiresInMinutes = 1440
    ): Promise<{ downloadUrl: string; expiresIn: number }> {
        const expiresIn = expiresInMinutes * 60;

        try {
            const command = new GetObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: fileKey,
            });

            const downloadUrl = await getSignedUrl(this.R2Client, command, {
                expiresIn,
            });

            return {
                downloadUrl,
                expiresIn,
            };
        } catch (error) {
            logger.error(
                `Error generating download presigned URL: ${error instanceof Error ? error.message : String(error)}`
            );
            throw new InternalServerError('Failed to generate download URL');
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

    public async completeSingleFileUpload({
        fileName,
        fileSize,
        contentType,
        fileKey,
        userId,
    }: {
        fileName: string;
        fileSize: number;
        contentType: string;
        fileKey: string;
        userId: number;
    }) {
        try {
            const result = await insertInputSet({
                userId,
                title: fileName,
                contentType: CONTENT_TYPE_INPUT_SET.FILE,
                metadata: {
                    contentType,
                    fileSize,
                    fileKey,
                },
            });

            return result;
        } catch {
            throw new DatabaseError('Failed to complete single file upload');
        }
    }
}

// Export singleton instance
export const uploadFileServiceOnR2 = new UploadFileService();
