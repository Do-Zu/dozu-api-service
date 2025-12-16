import { IBalancedSegment } from '@/types/youtube/youtube.type';
import logger from '@/utils/logger';
import type { Express } from 'express';
import { InternalServerError } from '@/core/error';
import whisperService from '../whisper/api/whisper.service';
import transcriptService from '@/services/transcript/transcript.service';

class MediaTranscriptionService {
    public async getTranscriptSegmentsFromFile(file: Express.Multer.File) {
        try {
            const rawTranscript = await whisperService.getTranscriptionFromFile(file);
            const parseResult = this.getTranscriptSegments(rawTranscript);
            if (!parseResult.ok) {
                throw new Error(parseResult.error);
            }
            const fullTranscriptLength = parseResult.data.map(segment => segment.text).join(' ');
            const maxSegmentLength = Math.min(fullTranscriptLength.length / 10, 500);
            const balancedSegments = transcriptService.chunkTranscriptSegments(parseResult.data, {
                maxSegmentLength,
            });
            return balancedSegments;
        } catch (err) {
            logger.error('Failed to process transcript', err);
            throw new InternalServerError('Failed to get transcription.');
        }
    }

    private getTranscriptSegments(
        transcript: string
    ): { ok: false; error: string } | { ok: true; data: IBalancedSegment[] } {
        const segmentRegex = /\d+\s+\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
        const timestampRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g;

        const timestampsMatched = [...transcript.matchAll(timestampRegex)];
        const timestamps = timestampsMatched.map(item => item[0]);
        const segmentsSplited = transcript.split(segmentRegex);
        const segments = segmentsSplited
            .map(segment => segment.replaceAll(/\s+/g, ' ').trim())
            .filter(segment => segment !== '');

        if (timestamps.length !== segments.length) {
            return { ok: false, error: 'Timestamps length is different from segments length' };
        }
        const data: IBalancedSegment[] = [];
        for (let i = 0; i < timestamps.length; ++i) {
            const text = segments[i];
            const startTime = this.getSeconds(timestamps[i].split('-->')[0]);
            const endTime = this.getSeconds(timestamps[i].split('-->')[1]);
            data.push({ startTime, endTime, text });
        }

        return { ok: true, data };
    }

    private getSeconds(timestamp: string) {
        const [timePart, msPart] = timestamp.split(',');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        const ms = msPart ? Number(msPart) / 1000 : 0;
        return hours * 3600 + minutes * 60 + seconds + ms;
    }
}

export default new MediaTranscriptionService();
