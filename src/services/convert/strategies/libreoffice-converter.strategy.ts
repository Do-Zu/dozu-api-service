import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { BaseFileConverter } from './base-converter.strategy';
import { CONVERT_CONFIG } from '@/services/convert/config/convert.config';
import { promisify } from 'util';
import logger from '@/utils/logger';

const writeFileAsync = promisify(fs.writeFile);

/**
 * LibreOffice converter strategy for document files
 * Uses Gotenberg service for conversion
 */
export class LibreOfficeConverter extends BaseFileConverter {
    protected supportedExtensions = CONVERT_CONFIG.SUPPORTED_EXTENSIONS.slice();
    private readonly gotenbergUrl: string = '';

    constructor() {
        super();

        if (CONVERT_CONFIG.GOTENBERG_URL) {
            this.gotenbergUrl = CONVERT_CONFIG.GOTENBERG_URL;
        } else {
            logger.warn('Missing GOTENBERG URL API');
        }
    }

    async convert(inputPath: string, outputPath: string): Promise<void> {
        this.validateInput(inputPath);
        this.validateOutput(outputPath);

        const formData = new FormData();
        formData.append('files', fs.createReadStream(inputPath));

        try {
            const response = await axios.post(`${this.gotenbergUrl}/forms/libreoffice/convert`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                responseType: 'arraybuffer',
                timeout: CONVERT_CONFIG.NETWORK_TIMEOUT,
            });

            await writeFileAsync(outputPath, response.data);
        } catch (error) {
            throw new Error(
                `Failed to convert file using LibreOffice. Ensure Gotenberg is running on ${this.gotenbergUrl}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
