import { Innertube } from 'youtubei.js';
import { isNullOrEmpty } from '@/utils/common';
import { InternalServerError, NotFoundError } from '@/core/error';
import { extractYoutubeVideoId, IYoutubeCaptionSegment } from '@/utils/youtube/youtube.util';
import { CaptionTrackData } from 'youtubei.js/dist/src/parser/classes/PlayerCaptionsTracklist';

let ytInstance: Innertube | null = null;

const getInnertube = async (): Promise<Innertube> => {
    if (ytInstance) return ytInstance;

    ytInstance = await Innertube.create({ enable_safety_mode: false });
    return ytInstance;
};

class YoutubeContentService {
    /** Get transcript (caption segments) for a video */
    public async getTranscript(input: { videoId?: string; url?: string; lang?: string }) {
        const videoId = extractYoutubeVideoId(input.videoId || input.url);
        const yt = await getInnertube();

        const info = await yt.getInfo(videoId);

        const title = info?.basic_info?.title || videoId;
        const videoInfo = info.basic_info;

        if (!info.captions || !info.captions.caption_tracks?.length) {
            throw new NotFoundError('No captions available for this video');
        }

        const preferredLang = input.lang || 'en';

        const track =
            info.captions.caption_tracks.find((t: CaptionTrackData) => t.language_code === preferredLang) ||
            info.captions.caption_tracks[0];

        let segments: IYoutubeCaptionSegment[] = [];

        try {
            const transcriptData = await info.getTranscript();

            if (isNullOrEmpty(transcriptData?.transcript?.content?.body?.initial_segments)) {
                throw new NotFoundError('No transcript segments available for this video');
            }

            const initialSegments = transcriptData?.transcript?.content?.body?.initial_segments || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            segments = initialSegments.map((segment: any) => {
                const startMs = segment.start_ms || 0;
                const startSecond = (startMs * 1.0) / 1000;
                const text = segment.snippet?.text || '';

                return {
                    startMs,
                    startSecond,
                    text,
                };
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new InternalServerError('Failed to fetch transcript data');
        }

        return {
            videoId,
            title,
            language: track.language_code,
            segments,
            videoInfo,
        };
    }
}

export const youtubeContentService = new YoutubeContentService();
