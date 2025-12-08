import path from 'node:path';
import { LaunchOptions } from 'puppeteer';

/**
 * Configuration constants for file conversion
 */
export const CONVERT_CONFIG = {
    UPLOAD_DIR: process.env.UPLOAD_CONVERT_FILE_DIR || path.join(process.cwd(), 'uploads/convert'),
    OUTPUT_DIR: process.env.OUTPUT_CONVERT_FILE_DIR || path.join(process.cwd(), 'outputs/convert'),
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    GOTENBERG_URL: process.env.GOTENBERG_URL,
    SUPPORTED_EXTENSIONS: ['.txt', '.docx', '.doc'],
    PDF_OPTIONS: {
        format: 'A4' as const,
        printBackground: true,
        margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm',
        },
    },
    PUPPETEER_OPTIONS: {
        headless: 'shell',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    } as LaunchOptions,
    NETWORK_TIMEOUT: 60000,
    DEFAULT_FORMAT_CONVERT: '.pdf',
    DEFAULT_FORMAT_MIMETYPE_CONVERT: 'application/pdf',
};

export type SupportedExtension = (typeof CONVERT_CONFIG.SUPPORTED_EXTENSIONS)[number];
