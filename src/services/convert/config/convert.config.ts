import path from 'path';
import { LaunchOptions } from 'puppeteer';

/**
 * Configuration constants for file conversion
 */
export const CONVERT_CONFIG = {
    UPLOAD_DIR: path.join(__dirname, '../../uploads/convert'),
    OUTPUT_DIR: path.join(__dirname, '../../outputs/convert'),
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    GOTENBERG_URL: process.env.GOTENBERG_URL || 'http://localhost:8100',
    SUPPORTED_EXTENSIONS: ['.txt', '.docx', '.doc'] as const,
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
} as const;

export type SupportedExtension = (typeof CONVERT_CONFIG.SUPPORTED_EXTENSIONS)[number];
