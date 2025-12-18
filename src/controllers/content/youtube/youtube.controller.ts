import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import youtubeService from '@/services/youtube/youtube.service';
import { Request, Response } from 'express';
interface YoutubeTranscriptRequest {
    url?: string;
    lang?: string;
}
class YoutubeContentController {
    public getTranscript = async (req: Request, res: Response) => {
        const { url, lang } = req.query as YoutubeTranscriptRequest;

        if (!url) throw new BadRequest('Missing youtube url');

        const data = await youtubeService.getTranscript({ url, lang });

        SuccessResponse.ok(res, data);
    };
}

export const youtubeContentController = new YoutubeContentController();
