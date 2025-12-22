import { IBalancedSegment } from '@/types/youtube/youtube.type';

class TranscriptService {
    public chunkTranscriptSegments(
        initialSegments: { text: string | undefined; startTime: number; endTime: number }[],
        options?: { maxSegmentLength?: number; minSegmentLength?: number }
    ) {
        const maxSegmentLength = options?.maxSegmentLength ?? 50;
        const minSegmentLength = options?.minSegmentLength ?? 50;
        const result: IBalancedSegment[] = [];

        let startTime: number = 0,
            endTime: number = 0,
            arrayOfText: string[] = [],
            currentLength = 0;
        for (const segment of initialSegments) {
            if (!segment.text) continue;
            const cleanedText = segment.text.replaceAll(/[\u200B-\u200D\uFEFF]/g, ' ').replaceAll(/\s+/g, ' ');
            if (!cleanedText) continue;
            if (arrayOfText.length === 0) startTime = segment.startTime;
            endTime = segment.endTime;
            arrayOfText.push(cleanedText);
            currentLength += cleanedText.length;
            if (currentLength > Math.max(maxSegmentLength, minSegmentLength)) {
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

export default new TranscriptService();
