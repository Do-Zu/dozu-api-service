import path from 'path';
import { IConversionResult, IFileService } from '@/types/convert.types';
import { ConverterFactory } from './strategies/converter-factory.strategy';
import { UrlToPdfConverter } from './strategies/url-converter.strategy';
import { FileService } from './file.service';
import { CONVERT_CONFIG } from '@/services/convert/config/convert.config';

/**
 * Service class for Convert functionality
 * Implements Dependency Injection and Single Responsibility Principle
 */
class ConvertService {
    private readonly converterFactory: ConverterFactory;
    private readonly urlConverter: UrlToPdfConverter;
    private readonly fileService: IFileService;
    private readonly uploadDir: string;
    private readonly outputDir: string;

    constructor(
        converterFactory: ConverterFactory = new ConverterFactory(),
        urlConverter: UrlToPdfConverter = new UrlToPdfConverter(),
        fileService: IFileService = new FileService()
    ) {
        this.converterFactory = converterFactory;
        this.urlConverter = urlConverter;
        this.fileService = fileService;
        this.uploadDir = CONVERT_CONFIG.UPLOAD_DIR;
        this.outputDir = CONVERT_CONFIG.OUTPUT_DIR;

        // Ensure directories exist
        this.fileService.ensureDirectoryExists(this.uploadDir);
        this.fileService.ensureDirectoryExists(this.outputDir);
    }

    /**
     * Convert a file to PDF
     * @param inputPath - Path to the input file
     * @param originalFilename - Original filename for generating output name
     * @returns Conversion result with buffer and metadata
     */
    async convertFile(inputPath: string, originalFilename: string): Promise<IConversionResult> {
        const extension = path.extname(originalFilename).toLowerCase();
        const outputFilename = this.fileService.generateUniqueFilename(originalFilename, '.pdf');
        const outputPath = path.join(this.outputDir, outputFilename);

        try {
            // Get appropriate converter using factory pattern
            const converter = this.converterFactory.getConverter(extension);

            // Perform conversion
            await converter.convert(inputPath, outputPath);

            // Read converted file
            const buffer = await this.fileService.readFile(outputPath);

            return {
                buffer,
                filename: outputFilename,
                mimeType: 'application/pdf',
            };
        } finally {
            // Cleanup: delete input and output files
            await this.fileService.deleteFile(inputPath);
            await this.fileService.deleteFile(outputPath);
        }
    }

    /**
     * Convert a URL to PDF
     * @param url - URL to convert
     * @returns Conversion result with buffer and metadata
     */
    async convertUrl(url: string): Promise<IConversionResult> {
        const outputFilename = this.fileService.generateUniqueFilename('url', '.pdf');
        const outputPath = path.join(this.outputDir, outputFilename);

        try {
            // Convert URL to PDF
            await this.urlConverter.convert(url, outputPath);

            // Read converted file
            const buffer = await this.fileService.readFile(outputPath);

            return {
                buffer,
                filename: outputFilename,
                mimeType: 'application/pdf',
            };
        } finally {
            // Cleanup: delete output file
            await this.fileService.deleteFile(outputPath);
        }
    }
}

export const convertService = new ConvertService();
