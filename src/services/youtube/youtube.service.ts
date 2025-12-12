import { NotFoundError, InternalServerError } from '@/core/error';
import Innertube from 'youtubei.js';
import { IBalancedSegment, IYoutubeCaptionSegment } from '../../types/youtube/youtube.type';
import { isNullOrEmpty, toNumber } from '@/utils/common';
import { extractYoutubeVideoId } from '@/utils/youtube/youtube.util';
import { CaptionTrackData } from 'youtubei.js/dist/src/parser/classes/PlayerCaptionsTracklist';
import { TranscriptSegment, TranscriptSectionHeader } from 'youtubei.js/dist/src/parser/nodes';

let ytInstance: Innertube | null = null;

const getInnertube = async (): Promise<Innertube> => {
    if (ytInstance) return ytInstance;

    ytInstance = await Innertube.create({ enable_safety_mode: false });
    return ytInstance;
};
class YoutubeService {
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

            segments = initialSegments.map((segment: TranscriptSegment | TranscriptSectionHeader) => {
                const startMs = toNumber(segment.start_ms || 0);
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

    public generateBalanceSegment({
        transcriptSegments,
        lengthTranscript,
    }: {
        transcriptSegments: IYoutubeCaptionSegment[];
        lengthTranscript: number;
    }) {
        const result: IBalancedSegment[] = [];

        const maximumSegmentLength = Math.min(lengthTranscript / 10, 500); // full transcript is divided into 10 separate parts

        let startTime: number = 0,
            endTime: number = 0,
            arrayOfText: string[] = [],
            currentLength = 0;
        for (const segment of transcriptSegments) {
            if (arrayOfText.length === 0) startTime = segment.startSecond;

            endTime = segment?.endSecond ?? 0;

            if (!segment.text) continue;

            const cleanedText = segment.text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');

            arrayOfText.push(cleanedText);

            currentLength += cleanedText.length;

            if (currentLength > maximumSegmentLength) {
                result.push({
                    startTime,
                    endTime,
                    text: arrayOfText.join(' '),
                });
                startTime = 0;
                currentLength = 0;
                arrayOfText = [];
            }
        }

        if (arrayOfText.length > 0) {
            result.push({
                startTime,
                endTime,
                text: arrayOfText.join(' '),
            });
        }

        return result;
    }
}

export default new YoutubeService();
