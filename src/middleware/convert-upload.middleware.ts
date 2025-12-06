import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CONVERT_CONFIG } from '@/services/convert/config/convert.config';

/**
 * Multer configuration for file uploads
 * Implements Single Responsibility Principle
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CONVERT_CONFIG.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

export const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: CONVERT_CONFIG.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const isSupported = CONVERT_CONFIG.SUPPORTED_EXTENSIONS.includes(ext as any);

        if (!isSupported) {
            return cb(
                new Error(
                    `Unsupported file format. Supported formats: ${CONVERT_CONFIG.SUPPORTED_EXTENSIONS.join(', ')}`
                )
            );
        }

        cb(null, true);
    },
});
