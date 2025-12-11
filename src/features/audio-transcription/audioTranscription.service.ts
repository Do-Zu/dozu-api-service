import { IBalancedSegment } from '@/types/youtube/youtube.type';
import { readFile, unlink, writeFile } from 'fs/promises';
import { UPLOADS_DIR_PATH } from '../whisper/whisper.constant';
import logger from '@/utils/logger';
import path from 'path';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { InternalServerError } from '@/core/error';
import transcriptService from '@/services/transcript/transcript.service';
import whisperService from '../whisper/whisper.service';

class AudioTranscriptionService {
    public async getTranscriptSegmentsFromAudio(audioFile: Express.Multer.File) {
        const tempInputAudioPath = await this.saveAudioTempFile(audioFile);
        let tempOutputPath = null;
        try {
            tempOutputPath = await whisperService.runWhisper(tempInputAudioPath);
            const rawTranscript = await readFile(tempOutputPath, 'utf-8');
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
            throw new InternalServerError('Failed to get transcription from audio.');
        } finally {
            this.safeUnlink(tempInputAudioPath);
            this.safeUnlink(tempOutputPath);
        }
    }

    private async saveAudioTempFile(file: Express.Multer.File) {
        const ext = path.extname(file.originalname).toLowerCase();
        const pathToSave = path.join(UPLOADS_DIR_PATH, `${uuidv4()}${ext}`);
        await writeFile(pathToSave, file.buffer);
        return pathToSave;
    }

    private async safeUnlink(path: string | null) {
        if (!path) return;
        await unlink(path).catch(() => {});
    }

    private getTranscriptSegments(
        transcript: string
    ): { ok: false; error: string } | { ok: true; data: IBalancedSegment[] } {
        const segmentRegex = /\d+\r\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
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
        const firstRow = timestamp.split(',')[0];
        const secondRowsSplited = firstRow.split(':');
        const hours = Number(secondRowsSplited[0]);
        const minutes = Number(secondRowsSplited[1]);
        const seconds = Number(secondRowsSplited[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }
}

export default new AudioTranscriptionService();
