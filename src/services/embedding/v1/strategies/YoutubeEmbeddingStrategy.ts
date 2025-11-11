import axios from 'axios';
import { youtubeContentService } from '@/services/content/youtube.content.service';
import { BaseEmbeddingStrategy } from '../BaseEmbeddingStrategy';
import { EmbeddingInput, EmbeddingResult, EnumEmbeddingInput } from '../embedding.type';
import { BadRequest } from '@/core/error';
import logger from '@/utils/logger';
import { isNilOrEmpty, toNumber } from '@/utils/common';

class YoutubeEmbeddingService extends BaseEmbeddingStrategy {
    private API_END_POINT_EMBEDDING;

    constructor() {
        super();
        this.API_END_POINT_EMBEDDING = `${this.BASE_API_EMBEDDING_SERVICE_PROVIDER}/youtube/segments/embedding`;
    }

    public canHandle(payload: EmbeddingInput): boolean {
        const { type } = payload;

        return type === EnumEmbeddingInput.YOUTUBE;
    }

    private async getYoutubeTranscript({ videoId }: { videoId: string }) {
        return await youtubeContentService.getTranscript({ videoId });
    }

    public async process(payload: EmbeddingInput): Promise<EmbeddingResult> {
        try {
            const { type, metadata } = payload;

            const videoId = metadata?.videoId as string;
            const maxGap = toNumber(metadata?.max_gap, 2);
            const minLength = toNumber(metadata?.min_length, 10);

            if (isNilOrEmpty(videoId)) {
                throw new BadRequest('Video Id Invalid');
            }

            const { segments } = await this.getYoutubeTranscript({ videoId });

            const { data, status, statusText } = await axios.post(this.API_END_POINT_EMBEDDING, {
                videoId,
                segments,
                max_gap: maxGap,
                min_length: minLength,
            });

            if (status !== 200) throw new BadRequest(statusText);

            return {
                type,
                metadata,
                data,
            };
        } catch (error) {
            logger.error('YoutubeEmbeddingService: process ', error);
            throw error;
        }
    }
}

export const youtubeEmbeddingService = new YoutubeEmbeddingService();
