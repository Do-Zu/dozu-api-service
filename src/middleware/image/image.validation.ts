import { BadRequest } from '@/core/error';
import { NextFunction, Request, Response } from 'express';

class ImageValidation {
    public validateImageSizeLimit(req: Request, res: Response, next: NextFunction) {
        const maxMb = 3;
        const maxSize = maxMb * 1024 * 1024;
        const file = req.file;

        if (!file) {
            throw new BadRequest('No file uploaded');
        }

        if (file.size > maxSize) {
            throw new BadRequest(`File size exceeds ${maxMb}MB.`);
        }

        next();
    }
}

export default new ImageValidation();
