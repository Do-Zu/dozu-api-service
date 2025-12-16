import { SuccessResponse } from '@/core/success';
import { Request, Response } from 'express';
import mediaTranscriptionService from './mediaTranscription.service';
import { BadRequest } from '@/core/error';

class MediaTranscriptionController {
    public async handleTranscribe(req: Request, res: Response) {
        if (!req.file) {
            throw new BadRequest('No file uploaded');
        }
        const file = req.file;
        const transcriptSegments = await mediaTranscriptionService.getTranscriptSegmentsFromFile(file);
        SuccessResponse.ok(res, transcriptSegments);
    }
}

export default new MediaTranscriptionController();
