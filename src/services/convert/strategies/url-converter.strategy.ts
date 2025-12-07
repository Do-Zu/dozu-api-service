import puppeteer, { Browser } from 'puppeteer';
import { IUrlConverter } from '@/types/convert.types';
import { CONVERT_CONFIG } from '@/services/convert/config/convert.config';
import { BadRequest, InternalServerError } from '@/core/error';

/**
 * URL to PDF converter using Puppeteer
 * Implements Single Responsibility Principle
 */
export class UrlToPdfConverter implements IUrlConverter {
    private browser: Browser | null = null;

    async convert(url: string, outputPath: string): Promise<void> {
        this.validateUrl(url);
        this.validateOutput(outputPath);

        try {
            await this.initializeBrowser();
            await this.convertUrlToPdf(url, outputPath);
        } finally {
            await this.closeBrowser();
        }
    }

    private validateUrl(url: string): void {
        if (!url) {
            throw new Error('URL is required');
        }

        try {
            const parsedUrl = new URL(url);
            const allowedProtocols = ['http:', 'https:'];

            if (!allowedProtocols.includes(parsedUrl.protocol)) {
                throw new BadRequest(`Invalid URL protocol. Only HTTP and HTTPS are allowed.`);
            }
        } catch {
            throw new BadRequest('Invalid URL format');
        }
    }

    private validateOutput(outputPath: string): void {
        if (!outputPath) {
            throw new Error('Output path is required');
        }
    }

    private async initializeBrowser(): Promise<void> {
        this.browser = await puppeteer.launch(CONVERT_CONFIG.PUPPETEER_OPTIONS);
    }

    private async convertUrlToPdf(url: string, outputPath: string): Promise<void> {
        if (!this.browser) {
            throw new InternalServerError('Browser not initialized');
        }

        const page = await this.browser.newPage();

        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: CONVERT_CONFIG.NETWORK_TIMEOUT,
            });

            await page.pdf({
                path: outputPath,
                ...CONVERT_CONFIG.PDF_OPTIONS,
            });
        } finally {
            await page.close();
        }
    }

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
