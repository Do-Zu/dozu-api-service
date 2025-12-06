import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { IFileService } from '@/types/convert.types';
import logger from '@/utils/logger';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * File service for handling file operations
 * Implements Single Responsibility Principle
 */
export class FileService implements IFileService {
    async saveFile(buffer: Buffer, filepath: string): Promise<void> {
        try {
            await writeFileAsync(filepath, buffer);
        } catch (error) {
            throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async readFile(filepath: string): Promise<Buffer> {
        try {
            return await readFileAsync(filepath);
        } catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteFile(filepath: string): Promise<void> {
        if (!this.fileExists(filepath)) {
            return;
        }

        try {
            await unlinkAsync(filepath);
        } catch (error) {
            // Log error but don't throw - cleanup is best effort
            logger.error(`Failed to delete file ${filepath}:`, error);
        }
    }

    fileExists(filepath: string): boolean {
        return fs.existsSync(filepath);
    }

    ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    generateUniqueFilename(originalName: string, extension: string = '.pdf'): string {
        const baseName = path.parse(originalName).name;
        return `${baseName}-${uuidv4()}${extension}`;
    }
}

export const fileService = new FileService();
