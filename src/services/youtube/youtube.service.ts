import { IBalancedSegment, IYoutubeCaptionSegment } from '../../types/youtube/youtube.type';
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
