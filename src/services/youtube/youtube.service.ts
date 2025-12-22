import { IYoutubeCaptionSegment } from '../../types/youtube/youtube.type';
import transcriptService from '../transcript/transcript.service';
import { youtubeTacIqService } from './youtube.taciq.service';

class YoutubeService {
    public async getTranscript(input: { url: string; lang?: string }) {
        return await youtubeTacIqService.getTranscriptSegment(input);
    }

    public generateBalanceSegment({
        transcriptSegments,
        lengthTranscript,
    }: {
        transcriptSegments: IYoutubeCaptionSegment[];
        lengthTranscript: number;
    }) {
        const maxSegmentLength = Math.min(lengthTranscript / 10, 500); // full transcript is divided into 10 separate parts
        const segments = transcriptSegments.map(item => ({
            text: item.text,
            startTime: item.startSecond,
            endTime: item.endSecond ?? 0,
        }));
        return transcriptService.chunkTranscriptSegments(segments, { maxSegmentLength });
    }
}

export default new YoutubeService();
