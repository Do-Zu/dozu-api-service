import { SuccessResponse } from '@/core/success';
import { Request, Response } from 'express';
import type { Express } from 'express';
import audioTranscriptionService from './audioTranscription.service';

class AudioTranscriptionController {
    public async handleTranscribe(req: Request, res: Response) {
        const audioFile = req.file as Express.Multer.File;
        const transcriptSegments = await audioTranscriptionService.getTranscriptSegmentsFromAudio(audioFile);
        SuccessResponse.ok(res, transcriptSegments);
    }
}

export default new AudioTranscriptionController();
