import { SuccessResponse } from '@/core/success';
import { Request, Response } from 'express';
import type { Express } from 'express';
import mediaTranscriptionService from './mediaTranscription.service';

class MediaTranscriptionController {
    public async handleTranscribe(req: Request, res: Response) {
        const file = req.file as Express.Multer.File;
        const transcriptSegments = await mediaTranscriptionService.getTranscriptSegmentsFromFile(file);
        SuccessResponse.ok(res, transcriptSegments);
    }
}

export default new MediaTranscriptionController();
