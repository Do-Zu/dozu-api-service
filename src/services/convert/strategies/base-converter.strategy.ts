import fs from 'fs';
import path from 'node:path';
import { IFileConverter } from '@/types/convert.types';
import { CONVERT_CONFIG } from '../config/convert.config';
import { BadRequest, Forbidden } from '@/core/error';

/**
 * Abstract base class for file converters
 * Implements Template Method pattern
 */
export abstract class BaseFileConverter implements IFileConverter {
    protected abstract supportedExtensions: string[];

    abstract convert(inputPath: string, outputPath: string): Promise<void>;

    supports(extension: string): boolean {
        return this.supportedExtensions.includes(extension.toLowerCase());
    }

    protected validateInput(inputPath: string): void {
        if (!inputPath) {
            throw new BadRequest('Input path is required');
        }

        const uploadDir = CONVERT_CONFIG.UPLOAD_DIR;
        const uploadDirResolved = fs.realpathSync(uploadDir);
        let normalizedInputPath;

        try {
            normalizedInputPath = fs.realpathSync(path.resolve(inputPath));
        } catch {
            throw new BadRequest('Input file path is invalid or inaccessible.');
        }

        if (!normalizedInputPath.startsWith(uploadDirResolved)) {
            throw new Forbidden('Access to files outside the upload directory is forbidden.');
        }
    }

    protected validateOutput(outputPath: string): void {
        if (!outputPath) {
            throw new Error('Output path is required');
        }
    }
}
