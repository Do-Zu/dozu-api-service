import { IFileConverter } from '@/types/convert.types';
import { LibreOfficeConverter } from './libreoffice-converter.strategy';

/**
 * Factory for creating file converters
 * Implements Factory Pattern
 */
export class ConverterFactory {
    private readonly converters: IFileConverter[];

    constructor() {
        this.converters = [new LibreOfficeConverter()];
    }

    getConverter(fileExtension: string): IFileConverter {
        const converter = this.converters.find(c => c.supports(fileExtension));

        if (!converter) {
            throw new Error(
                `Unsupported file format: ${fileExtension}. Supported formats: ${this.getSupportedFormats().join(', ')}`
            );
        }

        return converter;
    }

    getSupportedFormats(): string[] {
        const formats = new Set<string>();
        this.converters.forEach(converter => {
            // This assumes converters expose their supported extensions
            // You may need to adjust based on actual implementation
        });
        return Array.from(formats);
    }

    registerConverter(converter: IFileConverter): void {
        this.converters.push(converter);
    }
}
