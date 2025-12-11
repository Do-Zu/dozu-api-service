import { IBalancedSegment } from '@/types/youtube/youtube.type';
import { constants } from 'fs';
import { access, readFile, unlink, writeFile } from 'fs/promises';
import {
    UPLOADS_DIR_PATH,
    WHISPER_CLI_PATH,
    WHISPER_MODEL_PATH,
    WHISPER_OUTPUT_FILE_FORMAT,
} from './audioTranscription.constant';
import logger from '@/utils/logger';
import path from 'path';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { exec } from 'child_process';
import { InternalServerError } from '@/core/error';
import transcriptService from '@/services/transcript/transcript.service';

const execAsync = promisify(exec);

class AudioTranscriptionService {
    public async getTranscriptSegmentsFromAudio(audioFile: Express.Multer.File) {
        await this.ensureWhisperReady();

        const tempInputAudioPath = await this.saveAudioTempFile(audioFile);
        const tempOutputPath = `${tempInputAudioPath}.${WHISPER_OUTPUT_FILE_FORMAT}`;
        try {
            await this.runWhisper(tempInputAudioPath);
            const transcript = await readFile(tempOutputPath, 'utf-8');
            const transcriptSegmentsResult = this.getTranscriptSegments(transcript);
            if (!transcriptSegmentsResult.ok) {
                throw new Error(transcriptSegmentsResult.error);
            }
            const fullTranscriptLength = transcriptSegmentsResult.data.map(segment => segment.text).join(' ');
            const maxSegmentLength = Math.min(fullTranscriptLength.length / 10, 500);
            const balancedSegments = transcriptService.chunkTranscriptSegments(transcriptSegmentsResult.data, {
                maxSegmentLength,
            });
            return balancedSegments;
        } catch (err) {
            logger.error(err);
            throw new InternalServerError('Failed to get transcription from audio.');
        } finally {
            this.safeUnlink(tempInputAudioPath);
            this.safeUnlink(tempOutputPath);
        }
    }

    private async ensureWhisperReady() {
        const ok = await this.verifyWhisperPaths({
            cliPath: WHISPER_CLI_PATH,
            modelPath: WHISPER_MODEL_PATH,
        });

        if (!ok) {
            logger.error('Lacks whisper CLI or model to execute whisper command.');
            throw new Error('Whisper CLI or model not found.');
        }
    }

    private async saveAudioTempFile(file: Express.Multer.File) {
        const ext = path.extname(file.originalname).toLowerCase();
        const pathToSave = path.join(UPLOADS_DIR_PATH, `${uuidv4()}${ext}`);
        await writeFile(pathToSave, file.buffer);
        return pathToSave;
    }

    private async checkFileExist(path: string): Promise<boolean> {
        try {
            await access(path, constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }

    private async verifyWhisperPaths({ cliPath, modelPath }: { cliPath: string; modelPath: string }) {
        let ok: boolean = true;
        ok = (await this.checkFileExist(cliPath)) && (await this.checkFileExist(modelPath));

        return ok;
    }

    private getWhisperCommand(inputPath: string) {
        const whisperCommand = `
                            "${WHISPER_CLI_PATH}" 
                            -m "${WHISPER_MODEL_PATH}" 
                            -f "${inputPath}" 
                            -o${WHISPER_OUTPUT_FILE_FORMAT} 
                            -ng
                        `;
        return whisperCommand;
    }

    private async executeWhisperCommand(command: string) {
        await execAsync(command.split(/\s+/).join(' '));
    }

    private async runWhisper(inputPath: string) {
        const cmd = this.getWhisperCommand(inputPath);
        await this.executeWhisperCommand(cmd);
    }

    private async safeUnlink(path: string) {
        if (!path) return;
        await unlink(path);
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
