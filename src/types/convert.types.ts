/**
 * Type definitions for convert functionality
 */

export interface IConversionResult {
    buffer: Buffer;
    filename: string;
    mimeType: string;
}

export interface IFileConverter {
    convert(inputPath: string, outputPath: string): Promise<void>;
    supports(extension: string): boolean;
}

export interface IUrlConverter {
    convert(url: string, outputPath: string): Promise<void>;
}

export interface IFileService {
    saveFile(buffer: Buffer, filepath: string): Promise<void>;
    readFile(filepath: string): Promise<Buffer>;
    deleteFile(filepath: string): Promise<void>;
    fileExists(filepath: string): boolean;
    ensureDirectoryExists(dirPath: string): void;
    generateUniqueFilename(originalName: string, extension: string): string;
}
