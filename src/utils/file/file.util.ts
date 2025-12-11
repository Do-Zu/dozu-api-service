import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import logger from '../logger';
import { BadRequest } from '@/core/error';
import type { Express } from 'express';

/**
 * Enhanced file content reader with support for different file types
 * Supports text files, PDFs, and basic document formats
 */
async function readFileContent(filePath: string): Promise<string | null> {
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            logger.error(`File not found: ${filePath}`);
            return null;
        }

        const fileExtension = path.extname(filePath).toLowerCase();
        logger.info(`Reading file with extension: ${fileExtension}`);

        switch (fileExtension) {
            case '.txt':
            case '.md':
            case '.log':
                return readTextFile(filePath);

            case '.pdf':
                return readPDFFile(filePath);

            default:
                // Try to read as text file
                logger.warn(`Unsupported file type ${fileExtension}, attempting to read as text`);
                return readTextFile(filePath);
        }
    } catch (error) {
        logger.error(`Error reading file content: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Read plain text files with encoding detection
 */
function readTextFile(filePath: string): string | null {
    try {
        // Try UTF-8 first
        let content = fs.readFileSync(filePath, 'utf-8');

        // Basic validation for UTF-8
        if (content.includes('\uFFFD')) {
            // Try with latin1 encoding if UTF-8 fails
            content = fs.readFileSync(filePath, 'latin1');
        }

        return content;
    } catch (error) {
        logger.error(`Error reading text file: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Read PDF files using pdf-parse for professional text extraction
 */
async function readPDFFile(filePath: string): Promise<string | null> {
    try {
        logger.info(`Reading PDF file: ${path.basename(filePath)}`);

        // Read the PDF buffer
        const pdfBuffer = fs.readFileSync(filePath);
        // Parse PDF using pdf-parse with simplified options
        const pdfData = await pdfParse(pdfBuffer, {
            // Maximum number of pages to process (0 = all pages)
            max: 0,
        });

        // Validate extracted content
        if (!pdfData.text || pdfData.text.trim().length === 0) {
            logger.warn('PDF text extraction resulted in empty content');
            return 'PDF appears to contain only images, graphics, or scanned content that cannot be extracted as text. Please ensure the PDF contains selectable text.';
        }

        return cleanPDFText(pdfData.text, pdfData.numpages || 0);
    } catch (error) {
        logger.error(
            `Error reading PDF file with pdf-parse: ${error instanceof Error ? error.message : String(error)}`
        );

        // Fallback to basic extraction if pdf-parse fails completely
        logger.info('PDF-parse failed, attempting fallback extraction method...');
        return readPDFFileFallback(filePath);
    }
}

/**
 * Clean and normalize PDF text content
 */
function cleanPDFText(text: string, pageCount: number): string {
    const textLength = text.length;
    logger.info(`PDF extraction successful - Pages: ${pageCount}, Characters: ${textLength}`);

    // Clean and normalize the extracted text
    const cleanedText = text
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove page numbers and headers/footers (basic patterns)
        .replace(/^\d+\s*$/gm, '')
        // Remove isolated single characters that might be artifacts
        .replace(/\n\s*[a-zA-Z]\s*\n/g, '\n')
        // Fix hyphenated words split across lines
        .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
        // Normalize line breaks
        .replace(/\n{3,}/g, '\n\n')
        // Remove common PDF artifacts
        .replace(/\f/g, '\n') // Form feed to line break
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        // Fix common PDF text extraction issues
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
        .replace(/(\d)([A-Za-z])/g, '$1 $2') // Add space between numbers and letters
        .replace(/([A-Za-z])(\d)/g, '$1 $2') // Add space between letters and numbers
        .trim();

    // Add metadata about the PDF for better context in mindmap generation
    const metadata = `[PDF Document: ${pageCount} pages, ${Math.round(textLength / 1000)}K characters extracted]\n\n`;

    return metadata + cleanedText;
}

/**
 * Fallback PDF reading method (basic extraction)
 */
function readPDFFileFallback(filePath: string): string | null {
    try {
        logger.warn('Using fallback PDF extraction method (limited functionality)');

        const buffer = fs.readFileSync(filePath);
        const text = buffer.toString('binary');

        // Extract readable text patterns (very basic)
        const textMatches = text.match(/\(([^)]+)\)/g);
        if (textMatches) {
            const extractedText = textMatches
                .map(match => match.slice(1, -1))
                .filter(text => text.length > 3 && /[a-zA-Z]/.test(text))
                .join(' ');

            if (extractedText.length > 50) {
                return `[Fallback PDF extraction - limited quality]\n\n${extractedText}`;
            }
        }

        return 'PDF content could not be extracted. Please ensure the PDF contains selectable text and is not password protected.';
    } catch (error) {
        logger.error(`Fallback PDF reading failed: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Memory-efficient streaming file reader for very large files
 */
async function readFileStream(filePath: string, maxSize: number = 100 * 1024 * 1024): Promise<string> {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
        let content = '';
        let totalBytes = 0;

        stream.on('data', (chunk: string | Buffer) => {
            const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
            totalBytes += Buffer.byteLength(chunkStr, 'utf-8');

            if (totalBytes > maxSize) {
                stream.destroy();
                logger.warn(`File too large, truncating at ${maxSize} bytes`);
                resolve(content);
                return;
            }

            content += chunkStr;
        });

        stream.on('end', () => {
            resolve(content);
        });

        stream.on('error', error => {
            reject(error);
        });
    });
}

export function validateFileSize(file: Express.Multer.File | undefined | null, options?: { maxMb?: number }) {
    const maxMb = options?.maxMb ?? 5;
    const maxSize = maxMb * 1024 * 1024;

    if (!file) {
        throw new BadRequest('No file uploaded');
    }

    if (file.size > maxSize) {
        throw new BadRequest(`File size exceeds ${maxMb}MB.`);
    }
}

export function validateFileMimeTypes(
    file: Express.Multer.File | undefined | null,
    options?: { mimeTypes?: string[] }
) {
    const mimeTypes = options?.mimeTypes ?? [];
    if (!file) {
        throw new BadRequest('No file uploaded');
    }

    if (!mimeTypes.includes(file.mimetype)) {
        throw new BadRequest(`Invalid file type. Only ${mimeTypes.join(', ')} are allowed.`);
    }
}

export { readFileContent, readFileStream };
