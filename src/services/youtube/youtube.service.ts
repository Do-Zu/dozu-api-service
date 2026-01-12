import { IYoutubeCaptionSegment, IYoutubeServiceInput, IYoutubeServiceOutput } from '../../types/youtube/youtube.type';
import transcriptService from '../transcript/transcript.service';
import { youtubeTacIqService } from './youtube.taciq.service';



interface IYoutubeService {
    getTranscript: (input: IYoutubeServiceInput) => Promise<IYoutubeServiceOutput>;
}

class YoutubeService implements IYoutubeService {
    public async getTranscript(input: IYoutubeServiceInput): Promise<IYoutubeServiceOutput> {
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
