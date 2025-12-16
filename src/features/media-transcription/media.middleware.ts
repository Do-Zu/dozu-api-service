import { validateFileMimeTypes, validateFileSize } from '@/utils/file/file.util';
import { NextFunction, Request, Response } from 'express';

class MediaMiddleware {
    public validateSizeLimit(req: Request, res: Response, next: NextFunction) {
        validateFileSize(req.file, { maxMb: 20 });
        next();
    }

    public validateMimeType(req: Request, res: Response, next: NextFunction) {
        validateFileMimeTypes(req.file, { mimeTypes: ['audio/mpeg', 'audio/wav', 'video/mp4'] });
        next();
    }
}

export default new MediaMiddleware();
