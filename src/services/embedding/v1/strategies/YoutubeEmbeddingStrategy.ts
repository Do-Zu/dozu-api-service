import axios from 'axios';
import { youtubeContentService } from '@/services/content/youtube.content.service';
import { BaseEmbeddingStrategy } from '../BaseEmbeddingStrategy';
import {
    EmbeddingInputRequest,
    EmbeddingInputType,
    EmbeddingResult,
    EnumEmbeddingInput,
    YoutubeMetaDataInput,
} from '../embedding.type';
import { BadRequest } from '@/core/error';
import logger from '@/utils/logger';
import { compareIgnoreCapitalization, isNilOrEmpty, toNumber } from '@/utils/common';

import { calculateAttributeEmbedding } from '@/utils/youtube/youtube.util';
import { HTTP_STATUS } from '@/constants/index.constant';
import { NewEmbedding } from '@/repositories/embedding/embedding.repo';
import { EnumContentSegmentType } from '@/models';

interface EmbeddingItemRes {
    start: number;
    text: string;
    embedding: number[];
}
class YoutubeEmbeddingService extends BaseEmbeddingStrategy {
    private API_END_POINT_EMBEDDING;

    constructor() {
        super();
        this.API_END_POINT_EMBEDDING = `${this.BASE_API_EMBEDDING_SERVICE_PROVIDER}/youtube/segments/embedding`;
    }

    public canHandle(type: EmbeddingInputType): boolean {
        return compareIgnoreCapitalization(type, EnumEmbeddingInput.YOUTUBE);
    }

    private async getYoutubeTranscript({ videoId }: { videoId: string }) {
        return await youtubeContentService.getTranscript({ videoId });
    }

    public async process(payload: EmbeddingInputRequest): Promise<EmbeddingResult> {
        try {
            const { topicId, type, metadata } = payload;

            if (isNilOrEmpty(metadata)) throw new BadRequest('Empty Meta Data For Youtube Type');

            const { videoId, videoInfo, lengthContent, wordCount } = metadata as YoutubeMetaDataInput;

            if (isNilOrEmpty(videoId)) {
                throw new BadRequest('Video Id Invalid');
            }

            const duration = toNumber(videoInfo?.duration, 0);

            const { maxGap, minLength } = calculateAttributeEmbedding({
                lengthContent,
                duration,
                wordCount,
            });

            const { segments } = await this.getYoutubeTranscript({ videoId });

            const { data, status, statusText } = await axios.post(this.API_END_POINT_EMBEDDING, {
                videoId,
                segments,
                max_gap: maxGap,
                min_length: minLength,
            });

            if (status !== HTTP_STATUS.OK) throw new BadRequest(statusText);

            const embeddings = (data as { count: number; embeddings: EmbeddingItemRes[] }).embeddings;

            const listEmbeddingAdapter = this.adapterChunkItemAfterEmbedding({
                topicId,
                embeddings,
                type,
            });

            const storages = await this.storageVectorAfterEmbedding(listEmbeddingAdapter);

            return {
                type,
                metadata,
                count: storages.length,
                data: storages,
            };
        } catch (error) {
            logger.error('YoutubeEmbeddingService: process ', error);
            throw error;
        }
    }

    private adapterChunkItemAfterEmbedding({
        topicId,
        type,
        embeddings,
    }: {
        topicId: number;
        type: string;
        embeddings: EmbeddingItemRes[];
    }): NewEmbedding[] {
        try {
            if (!embeddings || embeddings.length === 0) return [];

            return embeddings.map(({ embedding: vector, start, text }, index) => ({
                contentType: type,
                embedding: vector,
                originContent: {
                    content: text,
                    type: EnumContentSegmentType.TEXT,
                },
                metadata: {
                    startTime: start,
                },
                topicId,
                chunkIndex: index,
            }));
        } catch (error) {
            logger.error('YoutubeEmbedding Service:  adapterChunkItemAfterEmbedding', error);
            return [];
        }
    }
}

export const youtubeEmbeddingService = new YoutubeEmbeddingService();
