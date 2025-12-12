import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import youtubeService from '@/services/youtube/youtube.service';
import { Request, Response } from 'express';

class YoutubeContentController {
    public getTranscript = async (req: Request, res: Response) => {
        const { videoId, url, lang } = req.query as { videoId?: string; url?: string; lang?: string };
        if (!videoId && !url) throw new BadRequest('Provide either videoId or url');
        const data = await youtubeService.getTranscript({ videoId, url, lang });
        SuccessResponse.ok(res, data, 'Transcript retrieved');
    };
}

export const youtubeContentController = new YoutubeContentController();
