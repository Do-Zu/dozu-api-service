import * as fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CONVERT_CONFIG, SupportedExtension } from '@/services/convert/config/convert.config';

/**
 * Ensure directory exists, create if it doesn't
 */
const ensureDirectoryExists = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Initialize directories on module load
ensureDirectoryExists(CONVERT_CONFIG.UPLOAD_DIR);
ensureDirectoryExists(CONVERT_CONFIG.OUTPUT_DIR);

/**
 * Multer configuration for file uploads
 * Implements Single Responsibility Principle
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirectoryExists(CONVERT_CONFIG.UPLOAD_DIR);
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
        const isSupported = CONVERT_CONFIG.SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);

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
