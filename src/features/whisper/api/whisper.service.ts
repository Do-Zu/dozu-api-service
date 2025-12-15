import logger from '@/utils/logger';
import axios from 'axios';
import FormData from 'form-data';
import type { Express } from 'express';

class WhisperService {
    private readonly isEnabled: boolean;
    private readonly whisperApiUrl: string;
    private readonly whisperInferenceUrl: string;

    constructor() {
        const url = process.env.WHISPER_API_URL;
        if (!url) {
            this.isEnabled = false;
            this.whisperApiUrl = '';
            this.whisperInferenceUrl = '';
            logger.warn('WHISPER_API_URL is missing — WhisperService disabled.');
            return;
        }
        this.isEnabled = true;
        this.whisperApiUrl = url;
        this.whisperInferenceUrl = url + '/inference';
    }

    private validateService() {
        if (!this.isEnabled) {
            throw new Error('Whisper service is not available.');
        }
    }

    public async getTranscriptionFromAudioFile(file: Express.Multer.File) {
        this.validateService();
        try {
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
            formData.append('response_format', 'srt');
            const response = await axios.post(this.whisperInferenceUrl, formData, {
                headers: formData.getHeaders(),
                timeout: 300_000,
            });
            const transcriptWithTimestamps = response.data;
            return transcriptWithTimestamps;
        } catch (err) {
            logger.error(err);
            throw new Error('Failed to process transcription.');
        }
    }
}

export default new WhisperService();
