import { Request, Response } from 'express';
import { convertService } from '@/services/convert/convert.service';
import { BadRequest } from '@/core/error';

/**
 * Controller class for Convert functionality
 * Handles HTTP request/response and delegates business logic to service layer
 */
class ConvertController {
    /**
     * Handle file to PDF conversion
     * @param req - Express request with uploaded file
     * @param res - Express response
     */
    async convertFile(req: Request, res: Response): Promise<void> {
        if (!req.file) {
            throw new BadRequest('File is required');
        }

        const { path: inputPath, originalname } = req.file;

        const result = await convertService.convertFile(inputPath, originalname);

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
    }

    /**
     * Handle URL to PDF conversion
     * @param req - Express request with URL in body
     * @param res - Express response
     */
    async convertUrl(req: Request, res: Response): Promise<void> {
        const { url } = req.body;

        if (!url) {
            throw new BadRequest('URL is required');
        }

        const result = await convertService.convertUrl(url);

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
    }
}

export const convertController = new ConvertController();
