/* eslint-disable no-undef */
import { UploadFileService } from '../upload.file.R2.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { insertInputSet } from '@/repositories/inputSet.repo';
import { BadRequest, InternalServerError, DatabaseError } from '@/core/error';
import { FileProcessingStatus } from '@/types/generate/generate.type';
import { Readable } from 'stream';

// Mock dependencies
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@/repositories/inputSet.repo');
jest.mock('@/utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

describe('UploadFileService', () => {
    let service: UploadFileService;
    const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
    const mockGetSignedUrl = getSignedUrl as jest.Mock;
    const mockInsertInputSet = insertInputSet as jest.Mock;

    beforeAll(() => {
        process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account-id';
        process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket';
        process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key';
        process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UploadFileService();
    });

    describe('processSingleFile', () => {
        it('should process a single file successfully', async () => {
            const file = {
                id: 'old-id',
                originalName: 'test.pdf',
                fileName: 'test.pdf',
                filePath: '/tmp/test.pdf',
                size: 1024,
                mimeType: 'application/pdf',
                uploadedAt: new Date(),
                status: FileProcessingStatus.PROCESSING,
            };
            const userId = 'user-123';

            const result = await service.processSingleFile({ file, userId });

            expect(result).toEqual(
                expect.objectContaining({
                    id: 'mock-uuid',
                    originalName: 'test.pdf',
                    status: FileProcessingStatus.COMPLETED,
                })
            );
        });
    });

    describe('generatePresignedUrlWithR2Cloudflare', () => {
        it('should generate a presigned URL successfully', async () => {
            const request = {
                fileName: 'test.pdf',
                fileSize: 1024,
                fileType: 'application/pdf',
                contentType: 'application/pdf',
            };
            mockGetSignedUrl.mockResolvedValue('https://presigned-url.com');

            const result = await service.generatePresignedUrlWithR2Cloudflare(request);

            expect(result).toEqual(
                expect.objectContaining({
                    uploadUrl: 'https://presigned-url.com',
                    fileId: 'mock-uuid',
                    fileKey: 'mock-uuid:test.pdf',
                })
            );
            expect(PutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'mock-uuid:test.pdf',
                    ContentType: 'application/pdf',
                })
            );
        });

        it('should throw BadRequest if fileName is missing', async () => {
            const request = {
                fileName: '',
                fileSize: 1024,
                fileType: 'application/pdf',
                contentType: 'application/pdf',
            };
            await expect(service.generatePresignedUrlWithR2Cloudflare(request)).rejects.toThrow(BadRequest);
        });

        it('should throw BadRequest if fileSize exceeds limit', async () => {
            const request = {
                fileName: 'test.pdf',
                fileSize: 1024 * 1024 * 1024 * 100, // Huge
                fileType: 'application/pdf',
                contentType: 'application/pdf',
            };
            const customService = new UploadFileService({ maxFileSize: 100 });
            await expect(customService.generatePresignedUrlWithR2Cloudflare(request)).rejects.toThrow(BadRequest);
        });

        it('should throw BadRequest if contentType is not allowed', async () => {
            const request = {
                fileName: 'test.exe',
                fileSize: 1024,
                fileType: 'application/x-msdownload',
                contentType: 'application/x-msdownload',
            };
            await expect(service.generatePresignedUrlWithR2Cloudflare(request)).rejects.toThrow(BadRequest);
        });
    });

    describe('getFileFromR2Cloudflare', () => {
        it('should retrieve file content successfully', async () => {
            const mockStream = new Readable();
            mockStream.push('file content');
            mockStream.push(null);

            const mockSend = jest.fn().mockResolvedValue({
                Body: mockStream,
                ContentType: 'text/plain',
                LastModified: new Date(),
            });

            mockS3Client.prototype.send = mockSend;

            const result = await service.getFileFromR2Cloudflare('mock-uuid:test.txt');

            expect(result.content.toString()).toBe('file content');
            expect(result.fileName).toBe('test.txt');
        });

        it('should throw InternalServerError if Body is empty', async () => {
            const mockSend = jest.fn().mockResolvedValue({
                Body: null,
            });
            mockS3Client.prototype.send = mockSend;

            await expect(service.getFileFromR2Cloudflare('key')).rejects.toThrow(InternalServerError);
        });
    });

    describe('generateDownloadPresignedUrl', () => {
        it('should generate download URL successfully', async () => {
            mockGetSignedUrl.mockResolvedValue('https://download-url.com');

            const result = await service.generateDownloadPresignedUrl('file-key');

            expect(result.downloadUrl).toBe('https://download-url.com');
            expect(GetObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'file-key',
                })
            );
        });
    });

    describe('completeSingleFileUpload', () => {
        it('should complete file upload and insert into DB', async () => {
            mockInsertInputSet.mockResolvedValue({ id: 1 });

            const params = {
                fileName: 'test.pdf',
                fileSize: 1024,
                contentType: 'application/pdf',
                fileKey: 'key',
                userId: 1,
            };

            const result = await service.completeSingleFileUpload(params);

            expect(mockInsertInputSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 1,
                    title: 'test.pdf',
                    metadata: {
                        contentType: 'application/pdf',
                        fileSize: 1024,
                        fileKey: 'key',
                    },
                })
            );
            expect(result).toEqual({ id: 1 });
        });

        it('should throw DatabaseError on failure', async () => {
            mockInsertInputSet.mockRejectedValue(new Error('DB Error'));
            const params = {
                fileName: 'test.pdf',
                fileSize: 1024,
                contentType: 'application/pdf',
                fileKey: 'key',
                userId: 1,
            };
            await expect(service.completeSingleFileUpload(params)).rejects.toThrow(DatabaseError);
        });
    });
});
