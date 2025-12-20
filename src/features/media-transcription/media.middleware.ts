import { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_SIZE_MB } from '@/utils/file/file.constant';
import { validateFileMimeTypes, validateFileSize } from '@/utils/file/file.util';
import { NextFunction, Request, Response } from 'express';

class MediaMiddleware {
    public validateSizeLimit(req: Request, res: Response, next: NextFunction) {
        validateFileSize(req.file, { maxMb: MAX_MEDIA_SIZE_MB });
        next();
    }

    public validateMimeType(req: Request, res: Response, next: NextFunction) {
        validateFileMimeTypes(req.file, { mimeTypes: ALLOWED_MEDIA_MIME_TYPES });
        next();
    }
}

export default new MediaMiddleware();
