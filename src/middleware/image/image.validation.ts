import { validateFileMimeTypes, validateFileSize } from '@/utils/file/file.util';
import { NextFunction, Request, Response } from 'express';

class ImageValidation {
    public validateImageSizeLimit(req: Request, res: Response, next: NextFunction) {
        validateFileSize(req.file, { maxMb: 3 });
        next();
    }

    public validateImageMimeType(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        validateFileMimeTypes(file, { mimeTypes: allowedMimeTypes });

        next();
    }
}

export default new ImageValidation();
