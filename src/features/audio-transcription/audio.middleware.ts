import { validateFileMimeTypes, validateFileSize } from '@/utils/file/file.util';
import { NextFunction, Request, Response } from 'express';

class AudioMiddleware {
    public validateAudioSizeLimit(req: Request, res: Response, next: NextFunction) {
        validateFileSize(req.file, { maxMb: 15 });
        next();
    }

    public validateAudioMimeType(req: Request, res: Response, next: NextFunction) {
        validateFileMimeTypes(req.file, { mimeTypes: ['audio/mpeg'] });
        next();
    }
}

export default new AudioMiddleware();
