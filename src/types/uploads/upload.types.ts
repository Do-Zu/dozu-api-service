/**
 * TypeScript interfaces and types for file upload functionality
 */

/**
 * Supported file upload encodings
 */
export type FileEncoding =
    | 'utf8'
    | 'ascii'
    | 'utf-8'
    | 'utf16le'
    | 'ucs2'
    | 'ucs-2'
    | 'base64'
    | 'latin1'
    | 'binary'
    | 'hex';

/**
 * File upload status
 */
export enum UploadStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * File category based on MIME type
 */
export enum FileCategory {
    DOCUMENT = 'document',
    IMAGE = 'image',
    TEXT = 'text',
    ARCHIVE = 'archive',
    OTHER = 'other',
}

/**
 * File upload request body interfaces
 */
export interface SingleFileUploadRequest {
    customPrompt?: string;
    userId?: string;
    category?: FileCategory;
    tags?: string[];
    description?: string;
}

export interface MultipleFileUploadRequest {
    customPrompt?: string;
    userId?: string;
    category?: FileCategory;
    tags?: string[];
    description?: string;
}

export interface MoveFileRequest {
    newDirectory: string;
}

export interface CleanupRequest {
    maxAgeInHours?: number;
}

export interface DeleteMultipleFilesRequest {
    fileIds: string[];
}

/**
 * File upload response interfaces
 */
export interface FileUploadResponse {
    id: string;
    originalName: string;
    fileName: string;
    filePath: string;
    size: number;
    mimeType: string;
    category: FileCategory;
    uploadedAt: string; // ISO date string
    status: UploadStatus;
    tags?: string[];
    description?: string;
}

export interface MultipleFileUploadResponse {
    successful: FileUploadResponse[];
    failed: Array<{
        originalName: string;
        error: string;
    }>;
    totalFiles: number;
    successCount: number;
    failureCount: number;
}

export interface FileInfoResponse extends FileUploadResponse {
    lastAccessed?: string; // ISO date string
    downloadCount?: number;
}

export interface FileListResponse {
    files: FileInfoResponse[];
    statistics: UploadStatistics;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface FileTextResponse {
    fileId: string;
    originalName: string;
    content: string;
    encoding: string;
    size: number;
}

export interface FileDeleteResponse {
    fileId: string;
    deleted: boolean;
    message: string;
}

export interface MultipleFileDeleteResponse {
    deleted: string[];
    failed: string[];
    totalRequested: number;
    deletedCount: number;
    failedCount: number;
}

export interface FileMoveResponse {
    fileId: string;
    originalPath: string;
    newPath: string;
    moved: boolean;
}

export interface CleanupResponse {
    deletedCount: number;
    maxAgeInHours: number;
    deletedFiles: string[];
}

/**
 * Upload statistics interface
 */
export interface UploadStatistics {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    fileTypes: Record<string, number>;
    categoryCounts: Record<FileCategory, number>;
    uploadsByDate: Record<string, number>; // date -> count
    largestFile: {
        id: string;
        name: string;
        size: number;
    } | null;
    mostRecentUpload: {
        id: string;
        name: string;
        uploadedAt: string;
    } | null;
}

/**
 * File validation result
 */
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * File processing options
 */
export interface FileProcessingOptions {
    generateThumbnail?: boolean;
    extractMetadata?: boolean;
    virusScan?: boolean;
    compressImages?: boolean;
    convertToText?: boolean;
}

/**
 * File search/filter options
 */
export interface FileSearchOptions {
    category?: FileCategory;
    mimeType?: string;
    minSize?: number;
    maxSize?: number;
    uploadedAfter?: Date;
    uploadedBefore?: Date;
    tags?: string[];
    searchTerm?: string; // search in filename or description
}

/**
 * File sort options
 */
export interface FileSortOptions {
    sortBy: 'name' | 'size' | 'uploadedAt' | 'lastAccessed';
    sortOrder: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    page: number;
    limit: number;
}

/**
 * Complete file query options
 */
export interface FileQueryOptions extends FileSearchOptions, FileSortOptions, PaginationOptions {}

/**
 * File metadata interface
 */
export interface FileMetadata {
    dimensions?: {
        width: number;
        height: number;
    };
    duration?: number; // for video/audio files
    pageCount?: number; // for PDF files
    wordCount?: number; // for text files
    encoding?: string;
    hashedChecksum?: string;
    virusScanResult?: {
        clean: boolean;
        threats: string[];
        scannedAt: string;
    };
}

/**
 * Enhanced file info with metadata
 */
export interface EnhancedFileInfo extends FileInfoResponse {
    metadata?: FileMetadata;
    processingOptions?: FileProcessingOptions;
}

/**
 * File upload configuration presets
 */
export interface UploadConfigPreset {
    name: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
    maxFiles?: number;
    processingOptions?: FileProcessingOptions;
}

/**
 * Common upload configuration presets
 */
export const UPLOAD_PRESETS: Record<string, UploadConfigPreset> = {
    DOCUMENT: {
        name: 'Document Upload',
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ],
        allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
        processingOptions: {
            extractMetadata: true,
            convertToText: true,
        },
    },
    IMAGE: {
        name: 'Image Upload',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
        processingOptions: {
            generateThumbnail: true,
            extractMetadata: true,
            compressImages: true,
        },
    },
    TEXT: {
        name: 'Text File Upload',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['text/plain', 'text/csv', 'text/markdown', 'application/json', 'text/html'],
        allowedExtensions: ['.txt', '.csv', '.md', '.json', '.html'],
        processingOptions: {
            extractMetadata: true,
            convertToText: true,
        },
    },
    ARCHIVE: {
        name: 'Archive Upload',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
        allowedExtensions: ['.zip', '.rar', '.7z'],
        processingOptions: {
            extractMetadata: true,
            virusScan: true,
        },
    },
};

/**
 * Presigned URL request interface
 */
export interface PresignedUrlRequest {
    fileName: string;
    fileSize: number;
    fileType: string;
    contentType: string;
}

/**
 * Presigned URL response interface
 */
export interface PresignedUrlResponse {
    uploadUrl: string;
    fileId: string;
    fileKey: string;
    expiresIn: number; // seconds
    conditions?: {
        maxFileSize: number;
        allowedContentTypes: string[];
    };
}

/**
 * R2 file download response interface
 */
export interface R2FileDownloadResponse {
    fileId: string;
    fileName: string;
    contentType: string;
    size: number;
    lastModified?: string; // ISO date string
}

/**
 * R2 presigned download URL response interface
 */
export interface R2PresignedDownloadResponse {
    downloadUrl: string;
    expiresIn: number; // seconds
    fileKey: string;
}
