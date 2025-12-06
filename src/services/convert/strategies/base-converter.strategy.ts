import { IFileConverter } from '@/types/convert.types';

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
            throw new Error('Input path is required');
        }
    }

    protected validateOutput(outputPath: string): void {
        if (!outputPath) {
            throw new Error('Output path is required');
        }
    }
}
