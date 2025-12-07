import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'util';
import sanitize from 'sanitize-filename';
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

    async deleteFile(filepath: string, rootDir: string): Promise<void> {
        let resolvedPath: string;

        try {
            resolvedPath = fs.realpathSync(path.resolve(rootDir, filepath));
        } catch {
            // If the file doesn't exist, realpathSync will throw
            return;
        }

        const rootResolved = fs.realpathSync(rootDir);

        if (!resolvedPath.startsWith(rootResolved)) {
            logger.error(`Attempted to delete file outside allowed directory: ${resolvedPath}`);
            return;
        }

        if (!this.fileExists(resolvedPath)) {
            return;
        }

        try {
            await unlinkAsync(resolvedPath);
        } catch (error) {
            // Log error but don't throw - cleanup is best effort
            logger.error(`Failed to delete file ${resolvedPath}:`, error);
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

    generateUniqueFilename(originalName: string, extension: string): string {
        const sanitizedName = sanitize(originalName);
        const baseName = path.parse(sanitizedName).name;
        return `${baseName}-${uuidv4()}${extension}`;
    }
}

export const fileService = new FileService();
