import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import youtubeService from '@/services/youtube/youtube.service';
import { isEmpty } from '@/utils/common';
import { extractYoutubeVideoId } from '@/utils/youtube/youtube.util';
import { Request, Response } from 'express';
interface YoutubeTranscriptRequest {
    url?: string;
    lang?: string;
}
class YoutubeContentController {
    public getTranscript = async (req: Request, res: Response) => {
        const { url, lang } = req.query as YoutubeTranscriptRequest;

        if (!url) throw new BadRequest('Missing youtube url');

        if (isEmpty(extractYoutubeVideoId(url))) throw new BadRequest();

        const data = await youtubeService.getTranscript({ url, lang });

        SuccessResponse.ok(res, data);
    };
}

export const youtubeContentController = new YoutubeContentController();
