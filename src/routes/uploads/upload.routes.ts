import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '../register.routes';
import { uploadFileController } from '@/controllers/uploads/upload.file.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import {
    validateFileId,
    validateFileIds,
    validateCleanupRequest,
    validateTextEncoding,
    validateSingleFileUpload,
    validateMultipleFilesUpload,
    validatePresignedUrlRequest,
    validatePresignedUpload,
} from '@/middleware/validations/upload.validation';
import { rateLimitMiddleware } from '@/config/middlewares/rate-limit.config';

const router = Router();

const uploadRateLimiter = rateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // max 10 requests per windowMs
});

// Apply global async handler
globalAsyncHandler(router);

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Single file upload routes
router.post(
    '/single',
    uploadRateLimiter,
    uploadFileController.getSingleUploadMiddleware('file'),
    validateSingleFileUpload(),
    uploadFileController.uploadSingleFile
);

// Multiple files upload routes
router.post(
    '/multiple',
    uploadRateLimiter,
    uploadFileController.getMultipleUploadMiddleware('files', 10),
    validateMultipleFilesUpload(),
    uploadFileController.uploadMultipleFiles.bind(uploadFileController)
);

// File management routes
// router.get('/', uploadFileController.getAllFiles.bind(uploadFileController));
router.get('/stats', uploadFileController.getUploadStats.bind(uploadFileController));
router.get('/:fileId', validateFileId(), uploadFileController.getFileInfo.bind(uploadFileController));
router.get('/:fileId/download', validateFileId(), uploadFileController.downloadFile.bind(uploadFileController));

router.get(
    '/:fileId/text',
    validateFileId(),
    validateTextEncoding(),
    uploadFileController.getFileAsText.bind(uploadFileController)
);

// File operations
router.delete('/:fileId', validateFileId(), uploadFileController.deleteFile.bind(uploadFileController));
router.delete('/batch', validateFileIds(), uploadFileController.deleteMultipleFiles.bind(uploadFileController));

// Cleanup operations
router.post('/cleanup', validateCleanupRequest(), uploadFileController.cleanupOldFiles.bind(uploadFileController));

// Presigned URL routes
router.post(
    '/presigned-url',
    validatePresignedUrlRequest(),
    uploadFileController.generatePresignedUrl.bind(uploadFileController)
);

router.post(
    '/presigned/:fileId',
    uploadFileController.getSingleUploadMiddleware('file'),
    validatePresignedUpload(),
    uploadFileController.uploadWithPresignedUrl.bind(uploadFileController)
);

router.get(
    '/presigned/:fileId/info',
    validateFileId(),
    uploadFileController.getPresignedUrlInfo.bind(uploadFileController)
);

router.get('/presigned/active', uploadFileController.getActivePresignedUrls.bind(uploadFileController));

router.post('/presigned/cleanup', uploadFileController.cleanupExpiredPresignedUrls.bind(uploadFileController));

// Register the route
registerRoute('/upload', router, {
    description: 'File upload and management API endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
